#!/usr/bin/env node
/**
 * Cloudflare Workers Builds deploy command: npm run deploy
 *
 * 1. wrangler deploy  — auto-provisions D1 / R2 / KV and publishes the Worker
 * 2. apply D1 migrations if the database is already available
 * 3. write JWT_SECRET / BETTER_AUTH_SECRET if missing
 *
 * Runtime bootstrap in the Worker also creates tables and secrets on first request.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = process.env.WRANGLER_CI_OVERRIDE_NAME || 'sonicjs';

function log(msg) {
  console.log(`[cf-deploy] ${msg}`);
}

function wranglerInherit(args) {
  log(`wrangler ${args.join(' ')}`);
  const result = spawnSync('npx', ['wrangler', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

function wranglerCapture(args, input) {
  try {
    const out = execFileSync('npx', ['wrangler', ...args], {
      cwd: root,
      encoding: 'utf8',
      input,
      stdio: input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
      env: process.env,
      timeout: 120_000,
    });
    return { ok: true, out: String(out || '') };
  } catch (error) {
    return {
      ok: false,
      out: `${error.stdout || ''}\n${error.stderr || ''}\n${error.message || ''}`,
    };
  }
}

log('Deploying Worker (auto-provision D1 / R2 / KV)...');
if (!wranglerInherit(['deploy'])) {
  console.error('[cf-deploy] wrangler deploy failed');
  process.exit(1);
}

log('Applying D1 migrations...');
const migrated = wranglerCapture(['d1', 'migrations', 'apply', 'DB', '--remote']);
if (!migrated.ok) {
  const retry = wranglerCapture(['d1', 'migrations', 'apply', 'DB', '--remote', '--yes']);
  log(retry.ok ? 'Migrations applied' : `Migrations will run on first request:\n${retry.out.slice(0, 400)}`);
} else {
  log('Migrations applied');
}

function listSecrets() {
  const listed = wranglerCapture(['secret', 'list', '--name', WORKER, '--format', 'json']);
  try {
    const rows = JSON.parse(listed.out || '[]');
    if (Array.isArray(rows)) return rows.map((row) => row?.name).filter(Boolean);
  } catch {
    /* ignore */
  }
  return [];
}

const existing = new Set(listSecrets());
for (const name of ['JWT_SECRET', 'BETTER_AUTH_SECRET', 'INDEXNOW_KEY']) {
  if (existing.has(name)) continue;
  const value =
    name === 'INDEXNOW_KEY' ? randomBytes(16).toString('hex') : randomBytes(32).toString('base64url');
  const put = wranglerCapture(['secret', 'put', name, '--name', WORKER], `${value}\n`);
  log(put.ok ? `Wrote secret ${name}` : `Secret ${name} will be created at runtime`);
}

log('Deploy finished');
