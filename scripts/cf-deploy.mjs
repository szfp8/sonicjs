#!/usr/bin/env node
/**
 * Cloudflare Deploy to Cloudflare / Workers Builds 一键部署入口。
 *
 * 不在 CI 里创建 D1/R2/KV，也不依赖 CLOUDFLARE_API_TOKEN。
 * Cloudflare 的 Deploy to Cloudflare 会在运行本命令前，根据 wrangler.toml
 * 自动 provision bindings；本命令只负责：
 *   1) 部署 Worker
 *   2) 对已 provision 的 D1 执行 migrations
 *
 * 这样 GitHub -> Cloudflare 的一键部署不再因为 build 环境没有 API Token
 * 而出现“资源没创建 / 后台登录 500”的问题。
 */
import { spawnSync } from 'node:child_process';

const workerName = process.env.CF_WORKER_NAME || 'sonicjs';

function run(args) {
  console.log(`[cf-deploy] npx wrangler ${args.join(' ')}`);
  const result = spawnSync('npx', ['wrangler', ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

try {
  // Cloudflare Deploy to Cloudflare has already provisioned bindings at this point.
  run(['deploy', '--name', workerName]);

  // D1 must be migrated after the binding exists. This is schema initialization,
  // not data import, and is safe to re-run because Wrangler tracks migrations.
  run(['d1', 'migrations', 'apply', 'DB', '--remote', '--yes']);

  console.log('[cf-deploy] One-click production deployment completed.');
} catch (error) {
  console.error('[cf-deploy] DEPLOY FAILED:', error?.message || error);
  process.exit(1);
}
