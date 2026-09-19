/**
 * 安全加固：响应头、公开表单简易限流、生产环境错误脱敏。
 * 不改变一键部署绑定模型（无硬编码 ID）。
 */

type KvLike = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
};

/** 附加安全响应头（不破坏现有 HTML/JSON） */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // 公开 SEO 站允许同源内联样式；不启用过严 CSP 以免 CMS 后台脚本失效
  if (!headers.has('Content-Security-Policy')) {
    headers.set(
      'Content-Security-Policy',
      "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
    );
  }
  // 避免缓存带 Cookie 的后台页
  const ct = headers.get('content-type') || '';
  if (ct.includes('text/html') && !headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'private, no-cache');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * 公开线索表单限流：同一 IP 每分钟最多 8 次。
 * 无 KV 时跳过（不阻断提交）。
 */
export async function assertLeadRateLimit(
  request: Request,
  kv?: KvLike,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (!kv) return { ok: true };
  const ip = clientIp(request).slice(0, 64);
  const key = `lead_rl:${ip}`;
  try {
    const raw = await kv.get(key);
    const count = raw ? Number(raw) || 0 : 0;
    if (count >= 8) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: '提交过于频繁，请稍后再试' }), {
          status: 429,
          headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': '60' },
        }),
      };
    }
    await kv.put(key, String(count + 1), { expirationTtl: 60 });
  } catch {
    /* 限流失败不阻断业务 */
  }
  return { ok: true };
}

/** 生产错误页：不向访客输出完整 stack */
export function publicSafeErrorDetail(detail: string | undefined, isProd = true): string | undefined {
  if (!detail) return undefined;
  if (!isProd) return detail.slice(0, 2000);
  // 仅保留首行简要信息
  const first = detail.split('\n')[0] || '';
  return first.slice(0, 240);
}
