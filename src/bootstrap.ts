import { SCHEMA_MIGRATIONS } from './schema-sql';

type D1Statement = {
  bind: (...args: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type D1Like = {
  prepare: (sql: string) => D1Statement;
  exec: (sql: string) => Promise<unknown>;
};

function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export async function bootstrapDatabase(db: D1Like): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_bootstrap (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);
  await db.exec(`CREATE TABLE IF NOT EXISTS app_secrets (
    name TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  for (const migration of SCHEMA_MIGRATIONS) {
    const done = await db
      .prepare('SELECT id FROM schema_bootstrap WHERE id = ?')
      .bind(migration.id)
      .first();
    if (done) continue;
    try {
      await db.exec(migration.sql);
    } catch (error) {
      const message = String((error as Error)?.message || error);
      if (!/duplicate column|already exists/i.test(message)) {
        console.warn(`[bootstrap] ${migration.id}:`, message);
      }
    }
    await db
      .prepare('INSERT OR IGNORE INTO schema_bootstrap (id, applied_at) VALUES (?, ?)')
      .bind(migration.id, Date.now())
      .run();
  }
}

export async function ensureAuthSecrets<T extends Record<string, unknown>>(
  env: T & { DB?: D1Like; JWT_SECRET?: string; BETTER_AUTH_SECRET?: string }
): Promise<T & { JWT_SECRET?: string; BETTER_AUTH_SECRET?: string }> {
  const next = { ...env } as T & { JWT_SECRET?: string; BETTER_AUTH_SECRET?: string };
  const db = env.DB;
  if (!db) return next;

  for (const name of ['JWT_SECRET', 'BETTER_AUTH_SECRET'] as const) {
    if (next[name]) continue;
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
  }
  return next;
}
