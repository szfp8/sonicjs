import worker from './index';
import { bootstrapDatabase, ensureAuthSecrets, type D1Like } from './bootstrap';
import { handleEnhancedSeoRequest } from './seo/enhanced';
import { publicSafeErrorDetail, withSecurityHeaders } from './security';

type RuntimeEnv = Record<string, unknown> & {
  DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  CACHE_KV?: { get: (k: string) => Promise<string | null>; put: (k: string, v: string, o?: { expirationTtl?: number }) => Promise<void> };
  JWT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  SITE_URL?: string;
};

function json(data: unknown, status = 200): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    }),
  );
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
  return withSecurityHeaders(new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
}

function errorPage(message: string, detail?: string): Response {
  const safe = String(message || 'Unknown error').slice(0, 500);
  const safeDetail = publicSafeErrorDetail(detail, true);
  const extra = safeDetail
    ? `<pre style="white-space:pre-wrap;background:#1e293b;padding:12px;border-radius:8px;color:#fca5a5;font-size:12px">${safeDetail.replace(/</g, '<')}</pre>`
    : '';
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>服务暂时不可用</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#0f172a;color:#e2e8f0}main{max-width:720px;margin:48px auto;padding:0 20px}a{color:#7dd3fc}</style>
</head><body><main>
<h1>前台暂时打不开</h1>
<p>${safe}</p>${extra}
<p>请先打开 <a href="/status">/status</a> 查看绑定与迁移状态。</p>
</main></body></html>`;
  return withSecurityHeaders(
    new Response(html, { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }),
  );
}

/**
 * Prepare a complete runtime env for a fresh Cloudflare account deploy.
 * - Bootstraps D1 tables if missing
 * - Ensures JWT / Better Auth secrets exist (persisted in D1)
 * - When BETTER_AUTH_URL / SITE_URL are empty (intentional for one-click),
 *   derives them from the current request origin so custom domains work
 *   for both registration and subsequent login (same Origin / Cookie).
 */
async function prepareEnv(env: RuntimeEnv, request?: Request): Promise<RuntimeEnv> {
  if (env.DB) {
    try {
      await bootstrapDatabase(env.DB);
    } catch (error) {
      console.warn('[bootstrap] database setup failed:', error);
    }
  }
  try {
    const next = await ensureAuthSecrets(env);

    // Better Auth must use the exact origin the browser is visiting.
    // Empty BETTER_AUTH_URL works on workers.dev but can produce origin/cookie
    // mismatch after a custom domain is attached (register succeeds, login fails).
    // Keep explicit config; otherwise derive from this request.
    if (request && !String(next.BETTER_AUTH_URL || '').trim()) {
      next.BETTER_AUTH_URL = new URL(request.url).origin;
    }
    if (request && !String(next.SITE_URL || '').trim()) {
      next.SITE_URL = new URL(request.url).origin;
    }

    return next;
  } catch (error) {
    console.warn('[bootstrap] ensureAuthSecrets failed:', error);
    return env;
  }
}

export default {
  async fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext) {
    try {
      const url = new URL(request.url);
      const runtimeEnv = await prepareEnv(env, request);

      if (url.pathname === '/status' || url.pathname === '/health') {
        let migrated = false;
        let migrateError = '';
        if (runtimeEnv.DB) {
          try {
            const row = await runtimeEnv.DB.prepare(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_user'",
            ).first();
            migrated = Boolean(row);
          } catch (error) {
            migrated = false;
            migrateError = String((error as Error)?.message || error).slice(0, 120);
          }
        }
        const resolvedAuthUrl = String(runtimeEnv.BETTER_AUTH_URL || '').trim() || null;
        const resolvedSiteUrl = String(runtimeEnv.SITE_URL || '').trim() || null;
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
          migrateError: migrateError || undefined,
          // Debug: shows the origin Better Auth will use for this request
          auth: {
            BETTER_AUTH_URL: resolvedAuthUrl,
            SITE_URL: resolvedSiteUrl,
            requestOrigin: url.origin,
            originMatch: resolvedAuthUrl === url.origin,
          },
        });
      }

      if (!runtimeEnv.DB && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth'))) {
        return setupPage(runtimeEnv);
      }

      try {
        const response = await handleEnhancedSeoRequest(request, runtimeEnv as never, async () => {
          try {
            return await worker.fetch(request, runtimeEnv, ctx);
          } catch (error) {
            console.error('[worker.fetch]', error);
            return errorPage(
              '后台应用处理失败（前台路由已尝试回退）。',
              String((error as Error)?.stack || (error as Error)?.message || error),
            );
          }
        });
        return withSecurityHeaders(response);
      } catch (error) {
        console.error('[enhanced]', error);
        try {
          const fallback = await worker.fetch(request, runtimeEnv, ctx);
          return withSecurityHeaders(fallback);
        } catch (inner) {
          return errorPage(
            '前台与后台均处理失败。',
            String((inner as Error)?.stack || (inner as Error)?.message || inner),
          );
        }
      }
    } catch (error) {
      console.error('[entrypoint]', error);
      return errorPage(
        'Worker 入口异常。',
        String((error as Error)?.stack || (error as Error)?.message || error),
      );
    }
  },

  async scheduled(controller: ScheduledController, env: RuntimeEnv, ctx: ExecutionContext) {
    if (!env.DB) return;
    try {
      const runtimeEnv = await prepareEnv(env);
      return worker.scheduled(controller, runtimeEnv, ctx);
    } catch (error) {
      console.warn('[scheduled]', error);
    }
  },
};
