-- Ensure organization/tenant tables match SonicJS + Better Auth expectations.
-- Safe to re-run: CREATE IF NOT EXISTS + ADD COLUMN may fail if already present (ignored by bootstrap).

CREATE TABLE IF NOT EXISTS auth_tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  domain TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tenant_member (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  email TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tenant_invitation (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at INTEGER NOT NULL,
  inviter_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tenant_team (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_tenant_member_tenant ON auth_tenant_member(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auth_tenant_member_user ON auth_tenant_member(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tenant_invitation_tenant ON auth_tenant_invitation(tenant_id);
