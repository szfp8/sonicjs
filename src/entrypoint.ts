import worker from './index';
import { bootstrapDatabase, ensureAuthSecrets, type D1Like } from './bootstrap';
import { handleEnhancedSeoRequest } from './seo/enhanced';

type RuntimeEnv = Record<string, unknown> & {
  DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  CACHE_KV?: unknown;
  JWT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function setupPage(env: RuntimeEnv): Response {
  const db = Boolean(env.DB);
  const r2 = Boolean(env.MEDIA_BUCKET);
  const kv = Boolean(env.CACHE_KV);
  const jwt = Boolean(env.JWT_SECRET);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>后台部署状态</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
    main { max-width: 720px; margin: 48px auto; padding: 0 20px; }
    h1 { font-size: 28px; }
    p { line-height: 1.6; color: #cbd5e1; }
    li { background: #1e293b; margin: 8px 0; padding: 12px 16px; border-radius: 10px; list-style: none; }
    .ok { color: #4ade80; } .no { color: #f87171; } a { color: #7dd3fc; }
  </style>
</head>
<body>
  <main>
    <h1>后台还不能登录</h1>
    <p>当前绑定：</p>
    <ul>
      <li>D1 DB：<span class="${db ? 'ok' : 'no'}">${db ? '已绑定' : '未绑定'}</span></li>
      <li>R2 MEDIA_BUCKET：<span class="${r2 ? 'ok' : 'no'}">${r2 ? '已绑定' : '未绑定'}</span></li>
      <li>KV CACHE_KV：<span class="${kv ? 'ok' : 'no'}">${kv ? '已绑定' : '未绑定'}</span></li>
      <li>JWT_SECRET：<span class="${jwt ? 'ok' : 'no'}">${jwt ? '已配置' : '未配置'}</span></li>
    </ul>
    <p>请确认 Cloudflare 构建使用仓库根目录，部署命令为 <code>npm run deploy</code>。状态：<a href="/status">/status</a></p>
  </main>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function prepareEnv(env: RuntimeEnv): Promise<RuntimeEnv> {
  if (env.DB) {
    try {
      await bootstrapDatabase(env.DB);
    } catch (error) {
      console.warn('[bootstrap] database setup failed:', error);
    }
  }
  return ensureAuthSecrets(env);
}

export default {
  async fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const runtimeEnv = await prepareEnv(env);

    if (url.pathname === '/status' || url.pathname === '/health') {
      let migrated = false;
      if (runtimeEnv.DB) {
        try {
          const row = await runtimeEnv.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_user'"
          ).first();
          migrated = Boolean(row);
        } catch {
          migrated = false;
        }
      }
      return json({
        ok: Boolean(runtimeEnv.DB) && migrated && Boolean(runtimeEnv.JWT_SECRET),
        worker: 'sonicjs',
        bindings: {
          DB: Boolean(runtimeEnv.DB),
          MEDIA_BUCKET: Boolean(runtimeEnv.MEDIA_BUCKET),
          CACHE_KV: Boolean(runtimeEnv.CACHE_KV),
          JWT_SECRET: Boolean(runtimeEnv.JWT_SECRET),
          BETTER_AUTH_SECRET: Boolean(runtimeEnv.BETTER_AUTH_SECRET),
        },
        migrated,
      });
    }

    if (!runtimeEnv.DB && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth'))) {
      return setupPage(runtimeEnv);
    }

    return handleEnhancedSeoRequest(request, runtimeEnv as never, () =>
      worker.fetch(request, runtimeEnv, ctx)
    );
  },

  async scheduled(controller: ScheduledController, env: RuntimeEnv, ctx: ExecutionContext) {
    if (!env.DB) return;
    const runtimeEnv = await prepareEnv(env);
    return worker.scheduled(controller, runtimeEnv, ctx);
  },
};
