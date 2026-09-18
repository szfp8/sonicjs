import { SEO_CITIES } from './cities';

type Env = {
  DB?: D1Database;
  SITE_NAME?: string;
};

type DocumentRow = {
  id: string;
  slug: string | null;
  title: string | null;
  data: string;
  published_at: number | null;
  updated_at: number;
};

const esc = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const siteName = (env: Env) => env.SITE_NAME || '全国财税发票服务';

function richText(value: unknown): string {
  if (typeof value === 'string') return esc(value).replaceAll(/\r?\n/g, '<br>');
  if (!value || typeof value !== 'object') return '';
  const node = value as Record<string, unknown>;
  if (typeof node.text === 'string') return esc(node.text);
  if (Array.isArray(node.children)) return node.children.map(richText).join('');
  return '';
}

function dataOf(row: DocumentRow): Record<string, unknown> {
  try {
    const parsed = JSON.parse(row.data);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function layout(title: string, description: string, body: string, canonical: string, env: Env): Response {
  return new Response(`<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow">
<style>
body{margin:0;background:#f6f8fb;color:#172033;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.8}
header{background:#0b3b82;color:#fff;padding:20px 5%}main{max-width:1100px;margin:auto;padding:24px 18px}.card{background:#fff;border:1px solid #e6eaf0;border-radius:14px;padding:24px;margin-bottom:18px;box-shadow:0 4px 18px rgba(15,23,42,.04)}
a{color:#155eef;text-decoration:none}.muted{color:#667085;font-size:13px}.tag{display:inline-block;padding:4px 9px;border-radius:999px;background:#eef4ff;color:#155eef;font-size:12px;margin-right:6px}.btn{display:inline-block;background:#155eef;color:#fff;padding:9px 15px;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.grid .card{margin:0}.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:12px 14px;border-radius:8px}
</style></head><body><header><strong>${esc(siteName(env))}</strong></header><main>${body}<div class="muted" style="margin-top:30px">本网站仅提供依法依规的财税、发票及税务流程咨询服务。</div></main></body></html>`, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
}

async function publishedArticles(db: D1Database, limit: number): Promise<DocumentRow[]> {
  const result = await db.prepare(`
    SELECT id, slug, title, data, published_at, updated_at
    FROM documents
    WHERE tenant_id = 'default'
      AND type_id = 'seo_article'
      AND is_published = 1
      AND deleted_at IS NULL
    ORDER BY COALESCE(published_at, updated_at) DESC, id DESC
    LIMIT ?
  `).bind(limit).all<DocumentRow>();
  return result.results || [];
}

async function articleBySlug(db: D1Database, slug: string): Promise<DocumentRow | null> {
  return db.prepare(`
    SELECT id, slug, title, data, published_at, updated_at
    FROM documents
    WHERE tenant_id = 'default'
      AND type_id = 'seo_article'
      AND slug = ?
      AND is_published = 1
      AND deleted_at IS NULL
    LIMIT 1
  `).bind(slug).first<DocumentRow>();
}

export async function handleEnhancedSeoRequest(
  request: Request,
  env: Env,
  fallback: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  const db = env.DB;
  if (!db) return fallback();

  if (request.method === 'GET' && url.pathname === '/news') {
    const articles = await publishedArticles(db, 30).catch(() => []);
    const cards = articles.map((row) => {
      const data = dataOf(row);
      const summary = String(data.summary || data.seoDescription || '');
      const source = String(data.sourceName || '公开政策来源');
      const slug = row.slug || row.id;
      return `<article class="card"><span class="tag">政策解读</span><span class="muted">来源：${esc(source)}</span><h2><a href="/article/${encodeURIComponent(slug)}">${esc(row.title || '财税资讯')}</a></h2><p>${esc(summary.slice(0, 180))}</p><a href="/article/${encodeURIComponent(slug)}">阅读全文 →</a></article>`;
    }).join('');
    const body = `<section class="card"><h1>财税政策与发票实务解读</h1><p><strong>来源 + 原创解读 + 企业实际价值</strong></p><p class="notice">政策类信息请以税务机关、财政部门等权威来源的最新公告为准。</p></section><section class="grid">${cards || '<div class="card"><p>暂无已发布文章，请在后台“政策解读 / SEO资讯”中发布内容。</p></div>'}</section>`;
    return layout(`财税政策解读｜${siteName(env)}`, '财税政策与发票实务解读，采用来源、原创解读、企业实际价值的内容结构。', body, `${url.origin}/news`, env);
  }

  if (request.method === 'GET' && url.pathname === '/search') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    if (!q) return layout(`搜索｜${siteName(env)}`, '搜索财税政策、发票和税务实务内容。', '<section class="card"><h1>搜索</h1><p>请输入关键词。</p></section>', `${url.origin}/search`, env);
    const rows = await db.prepare(`
      SELECT id, slug, title, data, published_at, updated_at
      FROM documents
      WHERE tenant_id = 'default' AND type_id = 'seo_article' AND is_published = 1 AND deleted_at IS NULL
        AND (title LIKE ? OR data LIKE ?)
      ORDER BY COALESCE(published_at, updated_at) DESC
      LIMIT 30
    `).bind(`%${q}%`, `%${q}%`).all<DocumentRow>().then((r) => r.results || []).catch(() => []);
    const cards = rows.map((row) => `<article class="card"><h2><a href="/article/${encodeURIComponent(row.slug || row.id)}">${esc(row.title || '财税资讯')}</a></h2><p>${esc(String(dataOf(row).summary || '').slice(0, 180))}</p></article>`).join('');
    return layout(`“${q}”搜索结果｜${siteName(env)}`, `搜索${q}相关财税资讯。`, `<section class="card"><h1>“${esc(q)}”搜索结果</h1><p class="muted">共找到 ${rows.length} 条已发布内容。</p></section><section class="grid">${cards || '<div class="card"><p>没有找到匹配内容。</p></div>'}</section>`, `${url.origin}/search?q=${encodeURIComponent(q)}`, env);
  }

  if (request.method === 'GET' && url.pathname.startsWith('/article/')) {
    const slug = decodeURIComponent(url.pathname.slice('/article/'.length)).trim();
    if (slug) {
      const row = await articleBySlug(db, slug).catch(() => null);
      if (row) {
        const data = dataOf(row);
        const title = String(data.seoTitle || data.seo_title || row.title || '财税政策解读');
        const description = String(data.seoDescription || data.seo_description || data.summary || '').slice(0, 180);
        const sourceName = String(data.sourceName || data.source_name || '公开政策来源');
        const sourceUrl = String(data.sourceUrl || data.source_url || '');
        const interpretation = richText(data.interpretation || data.originalInterpretation || data.content || '');
        const businessValue = richText(data.businessValue || '');
        const body = `<article class="card"><span class="tag">政策解读</span><h1>${esc(row.title || title)}</h1><p class="muted">来源：${esc(sourceName)}${sourceUrl ? ` · <a href="${esc(sourceUrl)}" rel="nofollow noopener" target="_blank">查看来源</a>` : ''}</p><hr><h2>原创解读</h2><div>${interpretation || '<p>暂无原创解读内容。</p>'}</div><h2>企业实际价值</h2><div>${businessValue || '<p>暂无企业实际价值说明。</p>'}</div><p class="notice">本文用于信息参考，具体政策以主管部门最新公开文件为准。</p></article>`;
        return layout(`${title}｜${siteName(env)}`, description, body, `${url.origin}/article/${encodeURIComponent(slug)}`, env);
      }
    }
  }

  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    const articles = await publishedArticles(db, 500).catch(() => []);
    const articleUrls = articles.map((row) => `${url.origin}/article/${encodeURIComponent(row.slug || row.id)}`);
    const urls = [`${url.origin}/`, `${url.origin}/news`, `${url.origin}/search`, `${url.origin}/contact`, ...SEO_CITIES.map((city) => `${url.origin}/city/${encodeURIComponent(city.name)}`), ...articleUrls];
    const unique = [...new Set(urls)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${unique.map((item) => `<url><loc>${esc(item)}</loc></url>`).join('')}</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
  }

  return fallback();
}
