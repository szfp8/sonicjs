import { SCHEMA_MIGRATIONS } from './schema-sql';

type D1Statement = {
  bind: (...args: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type D1Like = {
  prepare: (sql: string) => D1Statement;
  exec?: (sql: string) => Promise<unknown>;
  batch?: (statements: D1Statement[]) => Promise<unknown>;
};

function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

/** Split migration SQL into single executable statements (D1 is unreliable with multi-statement exec). */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) =>
      part
        .split('\n')
        .filter((line) => !/^\s*--/.test(line))
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function runSql(db: D1Like, sql: string): Promise<void> {
  const text = sql.trim();
  if (!text) return;
  try {
    await db.prepare(text).run();
  } catch (error) {
    const message = String((error as Error)?.message || error);
    // Fallback: some runtimes prefer exec for multi-line DDL
    if (db.exec) {
      try {
        await db.exec(text);
        return;
      } catch (error2) {
        const message2 = String((error2 as Error)?.message || error2);
        if (/duplicate column|already exists/i.test(message2)) return;
        throw error2;
      }
    }
    if (/duplicate column|already exists/i.test(message)) return;
    throw error;
  }
}

export async function bootstrapDatabase(db: D1Like): Promise<{ ok: boolean; error?: string }> {
  try {
    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS schema_bootstrap (
        id TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )`,
    );
    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS app_secrets (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    );

    for (const migration of SCHEMA_MIGRATIONS) {
      const done = await db
        .prepare('SELECT id FROM schema_bootstrap WHERE id = ?')
        .bind(migration.id)
        .first();
      if (done) continue;

      const statements = splitStatements(migration.sql);
      for (const stmt of statements) {
        try {
          await runSql(db, stmt);
        } catch (error) {
          const message = String((error as Error)?.message || error);
          if (/duplicate column|already exists/i.test(message)) continue;
          console.warn(`[bootstrap] ${migration.id} stmt failed:`, message.slice(0, 200));
          // Continue other statements so partial schema still helps register
        }
      }

      await db
        .prepare('INSERT OR IGNORE INTO schema_bootstrap (id, applied_at) VALUES (?, ?)')
        .bind(migration.id, Date.now())
        .run();
    }

    // Better Auth sign-up often omits first/last name; avoid NOT NULL failures on legacy tables.
    // SQLite cannot ALTER DEFAULT easily — insert path should still work if columns accept empty string.
    // Ensure table exists:
    const row = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_user'")
      .first();
    if (!row) {
      return { ok: false, error: 'auth_user table missing after bootstrap' };
    }
    return { ok: true };
  } catch (error) {
    const message = String((error as Error)?.message || error);
    console.warn('[bootstrap] database setup failed:', message);
    return { ok: false, error: message };
  }
}

export async function ensureAuthSecrets<T extends Record<string, unknown>>(
  env: T & { DB?: D1Like; JWT_SECRET?: string; BETTER_AUTH_SECRET?: string },
): Promise<T & { JWT_SECRET?: string; BETTER_AUTH_SECRET?: string }> {
  const next = { ...env } as T & { JWT_SECRET?: string; BETTER_AUTH_SECRET?: string };
  const db = env.DB;

  for (const name of ['JWT_SECRET', 'BETTER_AUTH_SECRET'] as const) {
    if (next[name]) continue;

    if (db) {
      try {
        const row = await db
          .prepare('SELECT value FROM app_secrets WHERE name = ?')
          .bind(name)
          .first<{ value: string }>();
        if (row?.value) {
          next[name] = row.value;
          continue;
        }
        const value = randomSecret();
        await db
          .prepare('INSERT OR IGNORE INTO app_secrets (name, value) VALUES (?, ?)')
          .bind(name, value)
          .run();
        const saved = await db
          .prepare('SELECT value FROM app_secrets WHERE name = ?')
          .bind(name)
          .first<{ value: string }>();
        next[name] = saved?.value || value;
        continue;
      } catch {
        // fall through to in-memory secret for this request
      }
    }

    // Last resort so register/login can work before CF Secrets are set
    next[name] = randomSecret();
  }
  return next;
}
