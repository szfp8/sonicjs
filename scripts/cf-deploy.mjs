#!/usr/bin/env node
/**
 * GitHub → Cloudflare 一键部署命令：npm run deploy
 *
 * 流程（全新账号可用）：
 * 1. 在当前 CF 账号里【新建】D1 / R2 / KV（没有才创建，已有则复用同名资源）
 * 2. 把 ID 写进 wrangler.toml 并 deploy Worker，绑定到这些资源
 * 3. 对【新的空 D1】执行 SQL 建表（不是从旧站点搬数据）
 * 4. 写入 JWT_SECRET 等 Secrets
 *
 * 「migrations」= 空库建表脚本，不是「数据迁移」。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = join(root, 'wrangler.toml');
const WORKER = process.env.WRANGLER_CI_OVERRIDE_NAME || process.env.CF_WORKER_NAME || 'sonicjs';
const D1_NAME = 'sonicjs';
const R2_NAME = 'sonicjs-media';
const KV_TITLE = 'CACHE_KV';

function log(msg) {
  console.log(`[cf-deploy] ${msg}`);
}

function wranglerInherit(args) {
  log(`wrangler ${args.join(' ')}`);
  const r = spawnSync('npx', ['wrangler', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  return r.status === 0;
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

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function extractUuid(text) {
  const match =
    text.match(/database_id\s*=\s*["']([0-9a-f-]{36})["']/i) ||
    text.match(/id\s*=\s*["']([0-9a-f-]{36})["']/i) ||
    text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || '';
}

function upsertTomlBinding(blockHeader, key, value) {
  let toml = readFileSync(wranglerPath, 'utf8');
  const line = `${key} = "${value}"`;
  const start = toml.indexOf(blockHeader);
  if (start < 0) {
    log(`wrangler.toml missing ${blockHeader}, skip patch`);
    return;
  }
  const next = toml.indexOf('\n[[', start + 1);
  const nextTable = toml.indexOf('\n[', start + blockHeader.length);
  const end = Math.min(...[next, nextTable, toml.length].filter((n) => n >= 0));
  let block = toml.slice(start, end);
  const re = new RegExp(`^${key}\\s*=.*$`, 'm');
  if (re.test(block)) block = block.replace(re, line);
  else block = block.trimEnd() + `\n${line}\n`;
  toml = toml.slice(0, start) + block + toml.slice(end);
  writeFileSync(wranglerPath, toml, 'utf8');
  log(`wrangler.toml: ${blockHeader} → ${key}=${value}`);
}

/** 1) 在 CF 账号新建（或复用同名）D1 */
function provisionD1() {
  log(`【新建/复用】D1 数据库 name=${D1_NAME}`);
  const listed = wranglerCapture(['d1', 'list', '--json']);
  const rows = listed.ok ? parseJson(listed.out, []) : [];
  const existing = Array.isArray(rows) ? rows.find((r) => r?.name === D1_NAME) : null;
  if (existing?.uuid || existing?.id) {
    const id = existing.uuid || existing.id;
    log(`D1 已存在，复用 id=${id}`);
    upsertTomlBinding('[[d1_databases]]', 'database_id', id);
    return id;
  }
  const created = wranglerCapture(['d1', 'create', D1_NAME]);
  const id = extractUuid(created.out);
  if (id) {
    log(`已新建 D1 ${D1_NAME} id=${id}`);
    upsertTomlBinding('[[d1_databases]]', 'database_id', id);
    return id;
  }
  log(`D1 create 输出:\n${created.out.slice(0, 600)}`);
  log('将依赖 wrangler deploy 的自动 provision（无 database_id 时）');
  return '';
}

/** 2) 新建 R2 桶 */
function provisionR2() {
  log(`【新建/复用】R2 桶 name=${R2_NAME}`);
  const created = wranglerCapture(['r2', 'bucket', 'create', R2_NAME]);
  if (created.ok || /already exists|409|exist/i.test(created.out)) {
    log(`R2 桶就绪: ${R2_NAME}`);
    return true;
  }
  log(`R2: ${created.out.slice(0, 400)}`);
  return false;
}

/** 3) 新建 KV */
function provisionKv() {
  log(`【新建/复用】KV namespace title=${KV_TITLE}`);
  const listed = wranglerCapture(['kv', 'namespace', 'list', '--json']);
  const rows = listed.ok ? parseJson(listed.out, []) : [];
  const existing = Array.isArray(rows)
    ? rows.find((r) => r?.title === KV_TITLE || r?.title === `${WORKER}-${KV_TITLE}`)
    : null;
  if (existing?.id) {
    log(`KV 已存在，复用 id=${existing.id}`);
    upsertTomlBinding('[[kv_namespaces]]', 'id', existing.id);
    return existing.id;
  }
  const created = wranglerCapture(['kv', 'namespace', 'create', KV_TITLE]);
  const id = extractUuid(created.out);
  if (id) {
    log(`已新建 KV ${KV_TITLE} id=${id}`);
    upsertTomlBinding('[[kv_namespaces]]', 'id', id);
    return id;
  }
  log(`KV: ${created.out.slice(0, 400)}`);
  log('将依赖 wrangler deploy 自动创建 KV');
  return '';
}

/** 对空 D1 执行建表 SQL（不是搬旧数据） */
function initSchema() {
  log('【空库建表】对 D1 执行 SQL schema（migrations 目录 = 建表脚本）...');
  let r = wranglerCapture(['d1', 'migrations', 'apply', 'DB', '--remote', '--yes']);
  if (!r.ok) r = wranglerCapture(['d1', 'migrations', 'apply', 'DB', '--remote']);
  if (r.ok || /No migrations to apply|already applied/i.test(r.out)) {
    log('D1 建表完成');
    return true;
  }
  console.error('[cf-deploy] D1 建表失败 — 登录会失败，请看日志');
  console.error(r.out.slice(0, 1200));
  return false;
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

function ensureSecrets() {
  const existing = new Set(listSecrets());
  for (const name of ['JWT_SECRET', 'BETTER_AUTH_SECRET', 'INDEXNOW_KEY']) {
    if (existing.has(name)) {
      log(`Secret ${name} 已存在，跳过`);
      continue;
    }
    const value =
      name === 'INDEXNOW_KEY' ? randomBytes(16).toString('hex') : randomBytes(32).toString('base64url');
    let put = wranglerCapture(['secret', 'put', name, '--name', WORKER], `${value}\n`);
    if (!put.ok) put = wranglerCapture(['secret', 'put', name], `${value}\n`);
    log(put.ok ? `已写入 Secret ${name}` : `写入 Secret ${name} 失败: ${put.out.slice(0, 200)}`);
  }
}

// ---- main ----
log(`Worker: ${WORKER}`);
log('步骤 A：在当前 Cloudflare 账号【新建】D1 / R2 / KV');
provisionD1();
provisionR2();
provisionKv();

log('步骤 B：发布 Worker 并绑定上述资源');
if (!wranglerInherit(['deploy', '--name', WORKER])) {
  if (!wranglerInherit(['deploy'])) {
    console.error('[cf-deploy] wrangler deploy 失败');
    process.exit(1);
  }
}

log('步骤 C：空 D1 建表（非数据迁移）');
initSchema();

log('步骤 D：写入 JWT_SECRET 等');
ensureSecrets();

log('完成。请打开 /status 确认 DB=true、migrated=true、JWT_SECRET=true');
