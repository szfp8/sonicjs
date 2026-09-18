import worker from './index';
import { handleEnhancedSeoRequest } from './seo/enhanced';

type RuntimeEnv = Record<string, unknown> & {
  DB?: unknown;
  MEDIA_BUCKET?: unknown;
  CACHE_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
  JWT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

async function readOrCreateSecret(
  kv: RuntimeEnv['CACHE_KV'],
  key: string
): Promise<string | undefined> {
  if (!kv) return undefined;
  const existing = await kv.get(key);
  if (existing) return existing;
  const created = randomSecret();
  await kv.put(key, created);
  return created;
}

async function ensureRuntimeSecrets(env: RuntimeEnv): Promise<RuntimeEnv> {
  const next: RuntimeEnv = { ...env };
  if (!next.JWT_SECRET) {
    const secret = await readOrCreateSecret(env.CACHE_KV, '__jwt_secret');
    if (secret) next.JWT_SECRET = secret;
  }
  if (!next.BETTER_AUTH_SECRET) {
    const secret = await readOrCreateSecret(env.CACHE_KV, '__better_auth_secret');
    if (secret) next.BETTER_AUTH_SECRET = secret;
  }
  return next;
}

function setupPage(env: RuntimeEnv): Response {
  const db = Boolean(env.DB);
  const r2 = Boolean(env.MEDIA_BUCKET);
  const kv = Boolean(env.CACHE_KV);
  const jwt = Boolean(env.JWT_SECRET);
  const auth = Boolean(env.BETTER_AUTH_SECRET);
  const ready = db && jwt;
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>后台部署状态</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
    main { max-width: 720px; margin: 48px auto; padding: 0 20px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    p { line-height: 1.6; color: #cbd5e1; }
    ul { padding: 0; list-style: none; }
    li { background: #1e293b; margin: 8px 0; padding: 12px 16px; border-radius: 10px; }
    .ok { color: #4ade80; }
    .no { color: #f87171; }
    a { color: #7dd3fc; }
  </style>
</head>
<body>
  <main>
    <h1>后台还不能登录</h1>
    <p>前台可以打开，后台需要 D1 数据库和登录密钥。当前绑定状态：</p>
    <ul>
      <li>D1 <code>DB</code>：<span class="${db ? 'ok' : 'no'}">${db ? '已绑定' : '未绑定'}</span></li>
      <li>R2 <code>MEDIA_BUCKET</code>：<span class="${r2 ? 'ok' : 'no'}">${r2 ? '已绑定' : '未绑定'}</span></li>
      <li>KV <code>CACHE_KV</code>：<span class="${kv ? 'ok' : 'no'}">${kv ? '已绑定' : '未绑定'}</span></li>
      <li><code>JWT_SECRET</code>：<span class="${jwt ? 'ok' : 'no'}">${jwt ? '已配置' : '未配置'}</span></li>
      <li><code>BETTER_AUTH_SECRET</code>：<span class="${auth ? 'ok' : 'no'}">${auth ? '已配置' : '未配置'}</span></li>
    </ul>
    <p>${ready ? '资源已就绪，请打开 <a href="/auth/register">/auth/register</a> 注册管理员。' : '请重新部署一次。仓库根目录的 <code>npm run build</code> 会自动创建 D1 / R2 / KV 和密钥。'}</p>
    <p>状态接口：<a href="/status">/status</a></p>
  </main>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === '/status' || url.pathname === '/health') {
      return json({
        ok: Boolean(env.DB),
        worker: 'sonicjs',
        bindings: {
          DB: Boolean(env.DB),
          MEDIA_BUCKET: Boolean(env.MEDIA_BUCKET),
          CACHE_KV: Boolean(env.CACHE_KV),
          JWT_SECRET: Boolean(env.JWT_SECRET),
          BETTER_AUTH_SECRET: Boolean(env.BETTER_AUTH_SECRET),
        },
      });
    }

    const runtimeEnv = await ensureRuntimeSecrets(env);
    if (!runtimeEnv.DB && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth'))) {
      return setupPage(runtimeEnv);
    }

    return handleEnhancedSeoRequest(request, runtimeEnv as never, () =>
      worker.fetch(request, runtimeEnv, ctx)
    );
  },

  async scheduled(controller: ScheduledController, env: RuntimeEnv, ctx: ExecutionContext) {
    if (!env.DB) return;
    const runtimeEnv = await ensureRuntimeSecrets(env);
    return worker.scheduled(controller, runtimeEnv, ctx);
  },
};
