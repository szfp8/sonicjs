#!/usr/bin/env node
/**
 * Cloudflare Deploy to Cloudflare / Workers Builds 一键部署入口。
 *
 * 原则：
 * - 只向 Cloudflare 发布 Worker，绝不 git commit / git push 回 GitHub
 * - 不把 database_id、KV id、账号密钥写进仓库文件
 * - 不在 CI 里执行 d1 create / r2 create / kv create（由 CF 按 wrangler.toml 自动 provision）
 * - 不依赖用户提供的 CLOUDFLARE_API_TOKEN 写入仓库
 * - migrations 失败不阻断；运行时 bootstrap 兜底
 *
 * 资源 ID 只存在于 Cloudflare 账号侧绑定，不会回调到 GitHub。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

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
  // 明确禁止：任何把部署结果写回 Git 的操作（本脚本不调用 git）
  if (process.env.CF_WRITE_BACK_TO_GITHUB === '1') {
    console.warn('[cf-deploy] CF_WRITE_BACK_TO_GITHUB is ignored — deploy never mutates the GitHub repo.');
  }

  // 1) 仅发布到 Cloudflare（资源 ID 留在 CF 侧，不改本地 wrangler.toml）
  run(['deploy', '--name', workerName]);

  // 2) 尽量应用 migrations；失败由运行时 bootstrap 兜底
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

  // 防御：若本地意外生成了带 ID 的文件，提醒不要提交（本脚本不删除用户工作区，仅告警）
  for (const f of ['wrangler.generated.toml', 'cf-deploy-state.json', 'deploy-meta.json']) {
    if (existsSync(f)) {
      console.warn(`[cf-deploy] Local file ${f} detected — do NOT commit it to GitHub (already in .gitignore).`);
    }
  }

  console.log('[cf-deploy] Deploy finished. No files were pushed back to GitHub.');
  console.log('[cf-deploy] Next: open /status then /auth/register then /admin');
} catch (error) {
  console.error('[cf-deploy] DEPLOY FAILED:', error?.message || error);
  process.exit(1);
}
