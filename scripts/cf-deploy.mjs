#!/usr/bin/env node
/**
 * Cloudflare Deploy to Cloudflare / Workers Builds 一键部署入口。
 *
 * 原则：
 * - 不在 CI 里执行 d1 create / r2 create / kv create（由 Cloudflare 根据 wrangler.toml 自动 provision）
 * - 不依赖用户提供的 CLOUDFLARE_API_TOKEN
 * - 部署 Worker 后尽量应用 D1 migrations；若 CI 环境暂时无法解析 database_id，
 *   不让整个部署失败——运行时 bootstrapDatabase / ensureAuthSecrets 会兜底建表和密钥
 *
 * 这样可避免「资源未绑定 / 后台登录 500」的典型一键部署失败。
 */
import { spawnSync } from 'node:child_process';

const workerName = process.env.CF_WORKER_NAME || process.env.WORKER_NAME || 'sonicjs';

function run(args, { allowFail = false } = {}) {
  console.log(`[cf-deploy] npx wrangler ${args.join(' ')}`);
  const result = spawnSync('npx', ['wrangler', ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    const msg = `wrangler ${args.join(' ')} exited with code ${code}`;
    if (allowFail) {
      console.warn(`[cf-deploy] WARN (non-fatal): ${msg}`);
      return false;
    }
    throw new Error(msg);
  }
  return true;
}

try {
  // 1) 发布 Worker。此时 Cloudflare 已根据 wrangler.toml 完成 D1/R2/KV provision 并绑定。
  run(['deploy', '--name', workerName]);

  // 2) 尝试对已绑定的 D1 执行官方 migrations。
  //    若 Workers Builds 环境暂时拿不到 database_id，允许失败：
  //    运行时 entrypoint 会调用 bootstrapDatabase 创建 auth_* 等必要表。
  const migrated = run(['d1', 'migrations', 'apply', 'DB', '--remote', '--yes'], {
    allowFail: true,
  });

  if (migrated) {
    console.log('[cf-deploy] D1 migrations applied successfully.');
  } else {
    console.warn(
      '[cf-deploy] D1 migrations skipped or failed in CI. Runtime bootstrap will create required tables on first request.',
    );
  }

  console.log('[cf-deploy] One-click production deployment completed.');
  console.log('[cf-deploy] Next: open /status then /auth/register then /admin');
} catch (error) {
  console.error('[cf-deploy] DEPLOY FAILED:', error?.message || error);
  process.exit(1);
}
