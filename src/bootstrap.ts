import { SCHEMA_MIGRATIONS } from './schema-sql';

type D1Statement = {
  bind: (...args: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type D1Like = {
  prepare: (sql: string) => D1Statement;
  exec?: (sql: string) => Promise<unknown>;
};

function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

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
    if (/duplicate column|already exists/i.test(message)) return;
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
    throw error;
  }
}

/** Minimal auth schema so /auth/register works even if full migrations failed. */
const MINIMAL_AUTH_SQL = `
CREATE TABLE IF NOT EXISTS auth_user (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',
  is_super_admin INTEGER NOT NULL DEFAULT 0,
  avatar TEXT,
  password_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at INTEGER,
  phone TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  email_notifications INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'dark',
  password_reset_token TEXT,
  password_reset_expires INTEGER,
  invitation_token TEXT,
  invited_by TEXT,
  invited_at INTEGER,
  accepted_invitation_at INTEGER,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_auth_user_email ON auth_user(email);
CREATE TABLE IF NOT EXISTS auth_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  active_organization_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_token ON auth_session(token);
CREATE TABLE IF NOT EXISTS auth_account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_account_user_id ON auth_account(user_id);
CREATE TABLE IF NOT EXISTS auth_verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

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

    // Always ensure minimal auth tables first (register depends on these)
    for (const stmt of splitStatements(MINIMAL_AUTH_SQL)) {
      try {
        await runSql(db, stmt);
      } catch (error) {
        console.warn('[bootstrap] minimal auth:', String((error as Error)?.message || error).slice(0, 200));
      }
    }

    for (const migration of SCHEMA_MIGRATIONS) {
      const done = await db
        .prepare('SELECT id FROM schema_bootstrap WHERE id = ?')
        .bind(migration.id)
        .first();
      if (done) continue;

      for (const stmt of splitStatements(migration.sql)) {
        try {
          await runSql(db, stmt);
        } catch (error) {
          const message = String((error as Error)?.message || error);
          if (/duplicate column|already exists/i.test(message)) continue;
          console.warn(`[bootstrap] ${migration.id}:`, message.slice(0, 200));
        }
      }

      await db
        .prepare('INSERT OR IGNORE INTO schema_bootstrap (id, applied_at) VALUES (?, ?)')
        .bind(migration.id, Date.now())
        .run();
    }

    const row = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_user'")
      .first();
    if (!row) return { ok: false, error: 'auth_user still missing' };
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
        /* fall through */
      }
    }

    next[name] = randomSecret();
  }
  return next;
}
