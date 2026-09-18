#!/usr/bin/env node
/**
 * Cloudflare Workers Builds hook (npm run build).
 *
 * Creates D1 / R2 / KV if missing, writes IDs into wrangler.toml,
 * applies D1 migrations, and ensures auth secrets.
 *
 * Must not fail the build: wrangler deploy still runs afterwards.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = join(root, 'wrangler.toml');
const WORKER = process.env.WRANGLER_CI_OVERRIDE_NAME || 'sonicjs';
const D1_NAME = 'sonicjs';
const R2_NAME = 'sonicjs-media';
const KV_TITLE = 'CACHE_KV';

const hasCfCreds = Boolean(
  process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CLOUDFLARE_API_KEY ||
    process.env.CF_API_TOKEN
);

function log(msg) {
  console.log(`[cf-setup] ${msg}`);
}

function wrangler(args, opts = {}) {
  const result = execFileSync('npx', ['wrangler', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    timeout: 120_000,
    ...opts,
  });
  return String(result ?? '');
}

function wranglerAllowFail(args) {
  try {
    return { ok: true, out: wrangler(args) };
  } catch (error) {
    const out = `${error.stdout || ''}\n${error.stderr || ''}\n${error.message || ''}`;
    return { ok: false, out };
  }
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function readToml() {
  return readFileSync(wranglerPath, 'utf8');
}

function writeToml(text) {
  writeFileSync(wranglerPath, text, 'utf8');
}

function upsertLine(toml, afterNeedle, line) {
  const key = line.split('=')[0].trim();
  const re = new RegExp(`^${key}\\s*=.*$`, 'm');
  const blockStart = toml.indexOf(afterNeedle);
  if (blockStart < 0) return toml;
  const nextBlock = toml.indexOf('\n[[', blockStart + afterNeedle.length);
  const nextTable = toml.indexOf('\n[', blockStart + afterNeedle.length);
  const ends = [nextBlock, nextTable, toml.length].filter((n) => n >= 0);
  const blockEnd = Math.min(...ends);
  const block = toml.slice(blockStart, blockEnd);
  if (re.test(block)) {
    const updated = block.replace(re, line);
    return toml.slice(0, blockStart) + updated + toml.slice(blockEnd);
  }
  const insertAt = block.endsWith('\n') ? block.length - 1 : block.length;
  const updated = block.slice(0, insertAt) + `\n${line}` + block.slice(insertAt);
  return toml.slice(0, blockStart) + updated + toml.slice(blockEnd);
}

function extractUuid(text) {
  const match =
    text.match(/database_id\s*=\s*"([0-9a-f-]{36})"/i) ||
    text.match(/id\s*=\s*"([0-9a-f-]{36})"/i) ||
    text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || '';
}

function ensureD1() {
  log(`Ensuring D1 database "${D1_NAME}"...`);
  const listed = wranglerAllowFail(['d1', 'list', '--json']);
  const rows = listed.ok ? parseJson(listed.out, []) : [];
  const found = Array.isArray(rows)
    ? rows.find((row) => row?.name === D1_NAME || row?.uuid)
    : null;
  const existing = Array.isArray(rows)
    ? rows.find((row) => row?.name === D1_NAME)
    : null;
  if (existing?.uuid || existing?.id) {
    log(`D1 already exists: ${existing.uuid || existing.id}`);
    return existing.uuid || existing.id;
  }
  const created = wranglerAllowFail(['d1', 'create', D1_NAME]);
  const id = extractUuid(created.out);
  if (id) {
    log(`Created D1 ${D1_NAME}: ${id}`);
    return id;
  }
  log(`D1 create/list skipped or failed:\n${created.out.slice(0, 500)}`);
  if (found?.uuid) return found.uuid;
  return '';
}

function ensureR2() {
  log(`Ensuring R2 bucket "${R2_NAME}"...`);
  const created = wranglerAllowFail(['r2', 'bucket', 'create', R2_NAME]);
  if (created.ok || /already exists|409/i.test(created.out)) {
    log(`R2 bucket ready: ${R2_NAME}`);
    return true;
  }
  log(`R2 create skipped or failed:\n${created.out.slice(0, 500)}`);
  return false;
}

function ensureKv() {
  log(`Ensuring KV namespace "${KV_TITLE}"...`);
  const listed = wranglerAllowFail(['kv', 'namespace', 'list', '--json']);
  const rows = listed.ok ? parseJson(listed.out, []) : [];
  const existing = Array.isArray(rows)
    ? rows.find((row) => row?.title === KV_TITLE || row?.title === `${WORKER}-${KV_TITLE}`)
    : null;
  if (existing?.id) {
    log(`KV already exists: ${existing.id}`);
    return existing.id;
  }
  const created = wranglerAllowFail(['kv', 'namespace', 'create', KV_TITLE]);
  const id = extractUuid(created.out);
  if (id) {
    log(`Created KV ${KV_TITLE}: ${id}`);
    return id;
  }
  log(`KV create skipped or failed:\n${created.out.slice(0, 500)}`);
  return '';
}

function patchWrangler({ d1Id, kvId }) {
  let toml = readToml();
  if (d1Id) toml = upsertLine(toml, '[[d1_databases]]', `database_id = "${d1Id}"`);
  if (kvId) toml = upsertLine(toml, '[[kv_namespaces]]', `id = "${kvId}"`);
  writeToml(toml);
  log('Updated wrangler.toml bindings');
}

function applyMigrations() {
  log('Applying D1 migrations (remote)...');
  const result = wranglerAllowFail(['d1', 'migrations', 'apply', 'DB', '--remote']);
  if (result.ok || /No migrations|already applied/i.test(result.out)) {
    log('D1 migrations applied');
    return;
  }
  log(`D1 migrations skipped or failed:\n${result.out.slice(0, 800)}`);
}

function secretNames() {
  const listed = wranglerAllowFail(['secret', 'list', '--name', WORKER, '--format', 'json']);
  const rows = listed.ok ? parseJson(listed.out, []) : [];
  if (Array.isArray(rows)) return rows.map((row) => row?.name).filter(Boolean);
  const table = wranglerAllowFail(['secret', 'list', '--name', WORKER]);
  return (table.out.match(/^[A-Z0-9_]+/gm) || []).filter((name) => name !== 'Name');
}

function putSecret(name, value) {
  try {
    execFileSync('npx', ['wrangler', 'secret', 'put', name, '--name', WORKER], {
      cwd: root,
      input: `${value}\n`,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      timeout: 60_000,
    });
    log(`Wrote secret ${name}`);
  } catch (error) {
    log(`Could not write secret ${name}: ${(error.stderr || error.message || '').toString().slice(0, 300)}`);
  }
}

function ensureSecrets() {
  const existing = new Set(secretNames());
  log(`Existing secrets: ${[...existing].join(', ') || '(none)'}`);
  if (!existing.has('JWT_SECRET')) putSecret('JWT_SECRET', randomBytes(32).toString('base64url'));
  if (!existing.has('BETTER_AUTH_SECRET')) {
    putSecret('BETTER_AUTH_SECRET', randomBytes(32).toString('base64url'));
  }
  if (!existing.has('INDEXNOW_KEY')) putSecret('INDEXNOW_KEY', randomBytes(16).toString('hex'));
}

function main() {
  log('Cloudflare one-click setup starting');
  if (!hasCfCreds) {
    log('No Cloudflare credentials in this environment; skipping resource setup.');
    log('Cloudflare Workers Builds will still run wrangler deploy next.');
    return;
  }
  const d1Id = ensureD1();
  ensureR2();
  const kvId = ensureKv();
  patchWrangler({ d1Id, kvId });
  applyMigrations();
  ensureSecrets();
  log('Setup finished');
}

try {
  main();
} catch (error) {
  console.warn('[cf-setup] non-fatal error:', error?.message || error);
  process.exitCode = 0;
}
