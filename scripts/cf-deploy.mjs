#!/usr/bin/env node
/**
 * Cloudflare Workers Builds: npm run deploy
 *
 * 1. wrangler deploy — 发布 Worker，并尽量自动创建 D1 / R2 / KV
 * 2. 远程应用 D1 migrations（必须成功，否则登录/后台全挂）
 * 3. 写入 JWT_SECRET / BETTER_AUTH_SECRET / INDEXNOW_KEY
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = process.env.WRANGLER_CI_OVERRIDE_NAME || process.env.CF_WORKER_NAME || 'sonicjs';

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
      timeout: 180_000,
    });
    return { ok: true, out: String(out || '') };
  } catch (error) {
    return {
      ok: false,
      out: `${error.stdout || ''}\n${error.stderr || ''}\n${error.message || ''}`,
    };
  }
}

log(`Worker name: ${WORKER}`);
log('Deploying Worker (D1 / R2 / KV)...');
if (!wranglerInherit(['deploy', '--name', WORKER])) {
  // 部分 CI 已用 name 覆盖，再试一次无 --name
  if (!wranglerInherit(['deploy'])) {
    console.error('[cf-deploy] wrangler deploy failed');
    process.exit(1);
  }
}

log('Applying D1 migrations (remote)...');
let migrated = wranglerCapture(['d1', 'migrations', 'apply', 'DB', '--remote', '--yes']);
if (!migrated.ok) {
  log(`first migrate attempt failed:\n${migrated.out.slice(0, 800)}`);
  migrated = wranglerCapture(['d1', 'migrations', 'apply', 'DB', '--remote']);
}
if (migrated.ok) {
  log('D1 migrations applied OK');
} else {
  console.error('[cf-deploy] D1 migrations FAILED — login/admin will break until tables exist');
  console.error(migrated.out.slice(0, 1200));
  // 不 exit(1)：仍尝试写 secret，方便日志完整；首次请求 bootstrap 会再尝试建表
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
  if (existing.has(name)) {
    log(`Secret ${name} already exists, skip`);
    continue;
  }
  const value =
    name === 'INDEXNOW_KEY' ? randomBytes(16).toString('hex') : randomBytes(32).toString('base64url');
  const put = wranglerCapture(['secret', 'put', name, '--name', WORKER], `${value}\n`);
  if (put.ok) log(`Wrote secret ${name}`);
  else {
    log(`secret put ${name} failed, retry without --name...`);
    const put2 = wranglerCapture(['secret', 'put', name], `${value}\n`);
    log(put2.ok ? `Wrote secret ${name}` : `FAILED secret ${name}: ${put2.out.slice(0, 300)}`);
  }
}

log('Deploy finished. Open /status — need ok=true, DB=true, migrated=true, JWT_SECRET=true');
