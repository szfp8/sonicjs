import { SEO_CITIES } from './cities';
import { detectLanguage, languageCookieHeader, supportedLanguages, type LanguageCode } from '../i18n/config';
import { t } from '../i18n/messages';

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

const siteName = (env: Env, lang: LanguageCode) => env.SITE_NAME || t(lang).siteName;

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

function langSwitcher(request: Request, lang: LanguageCode): string {
  const url = new URL(request.url);
  const options = (Object.keys(supportedLanguages) as LanguageCode[])
    .map((code) => {
      const u = new URL(url.toString());
      u.searchParams.set('lang', code);
      const label = supportedLanguages[code];
      const active = code === lang ? ' style="font-weight:700;text-decoration:underline"' : '';
      return `<a href="${esc(u.pathname + u.search)}"${active}>${esc(label)}</a>`;
    })
    .join(' · ');
  return `<nav class="lang">${t(lang).language}: ${options}</nav>`;
}

function mainNav(origin: string, lang: LanguageCode): string {
  const m = t(lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  return `<nav class="main-nav">
    <a href="/${q}">${esc(m.navHome)}</a>
    <a href="/news${q}">${esc(m.navNews)}</a>
    <a href="/wechat${q}">${esc(m.navWechat)}</a>
    <a href="/contact${q}">${esc(m.navContact)}</a>
    <a href="/search${q}">${esc(m.navSearch)}</a>
  </nav>`;
}

function layout(
  title: string,
  description: string,
  body: string,
  canonical: string,
  env: Env,
  request: Request,
  lang: LanguageCode,
): Response {
  const m = t(lang);
  const htmlLang = lang === 'zh' ? 'zh-CN' : lang;
  const response = new Response(`<!doctype html>
<html lang="${htmlLang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow">
<style>
body{margin:0;background:#f6f8fb;color:#172033;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.8}
header{background:#0b3b82;color:#fff;padding:16px 5%}
header .top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
header a{color:#fff;text-decoration:none;margin-right:12px;opacity:.95}
header a:hover{opacity:1;text-decoration:underline}
.lang a{color:#cfe0ff;font-size:13px;margin:0 2px}
main{max-width:1100px;margin:auto;padding:24px 18px}
.card{background:#fff;border:1px solid #e6eaf0;border-radius:14px;padding:24px;margin-bottom:18px;box-shadow:0 4px 18px rgba(15,23,42,.04)}
a{color:#155eef;text-decoration:none}.muted{color:#667085;font-size:13px}
.tag{display:inline-block;padding:4px 9px;border-radius:999px;background:#eef4ff;color:#155eef;font-size:12px;margin-right:6px}
.btn{display:inline-block;background:#155eef;color:#fff;padding:9px 15px;border-radius:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.grid .card{margin:0}
.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:12px 14px;border-radius:8px}
.cover{width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:10px}
</style></head><body>
<header><div class="top"><strong>${esc(siteName(env, lang))}</strong>${langSwitcher(request, lang)}</div>
${mainNav(new URL(request.url).origin, lang)}</header>
<main>${body}<div class="muted" style="margin-top:30px">${esc(m.footer)}</div></main></body></html>`, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'set-cookie': languageCookieHeader(lang),
    },
  });
  return response;
}

async function publishedByType(db: D1Database, typeId: string, limit: number, lang?: string): Promise<DocumentRow[]> {
  let sql = `
    SELECT id, slug, title, data, published_at, updated_at
    FROM documents
    WHERE tenant_id = 'default'
      AND type_id = ?
      AND is_published = 1
      AND deleted_at IS NULL
  `;
  const binds: (string | number)[] = [typeId];
  if (lang && lang !== 'zh') {
    // Prefer language-tagged rows when present; still show untagged/zh as fallback list is separate
    sql += ` AND (json_extract(data, '$.language') = ? OR json_extract(data, '$.language') IS NULL OR json_extract(data, '$.language') = '')`;
    binds.push(lang);
  }
  sql += ` ORDER BY COALESCE(published_at, updated_at) DESC, id DESC LIMIT ?`;
  binds.push(limit);
  const result = await db.prepare(sql).bind(...binds).all<DocumentRow>();
  return result.results || [];
}

async function publishedArticles(db: D1Database, limit: number): Promise<DocumentRow[]> {
  return publishedByType(db, 'seo_article', limit);
}

async function publishedWechat(db: D1Database, limit: number, lang?: LanguageCode): Promise<DocumentRow[]> {
  return publishedByType(db, 'wechat_article', limit, lang);
}

async function articleBySlug(db: D1Database, typeId: string, slug: string): Promise<DocumentRow | null> {
  return db.prepare(`
    SELECT id, slug, title, data, published_at, updated_at
    FROM documents
    WHERE tenant_id = 'default'
      AND type_id = ?
      AND slug = ?
      AND is_published = 1
      AND deleted_at IS NULL
    LIMIT 1
  `).bind(typeId, slug).first<DocumentRow>();
}

export async function handleEnhancedSeoRequest(
  request: Request,
  env: Env,
  fallback: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  const db = env.DB;
  if (!db) return fallback();

  const lang = detectLanguage(request);
  const m = t(lang);
  const origin = url.origin;

  if (request.method === 'GET' && url.pathname === '/news') {
    const articles = await publishedArticles(db, 30).catch(() => []);
    const cards = articles.map((row) => {
      const data = dataOf(row);
      const summary = String(data.summary || data.seoDescription || '');
      const source = String(data.sourceName || (lang === 'zh' ? '公开政策来源' : 'Official source'));
      const slug = row.slug || row.id;
      return `<article class="card"><span class="tag">${esc(m.navNews)}</span><span class="muted">${esc(m.source)}：${esc(source)}</span><h2><a href="/article/${encodeURIComponent(slug)}${lang !== 'zh' ? `?lang=${lang}` : ''}">${esc(row.title || m.newsTitle)}</a></h2><p>${esc(summary.slice(0, 180))}</p><a href="/article/${encodeURIComponent(slug)}${lang !== 'zh' ? `?lang=${lang}` : ''}">${esc(m.newsReadMore)}</a></article>`;
    }).join('');
    const body = `<section class="card"><h1>${esc(m.newsTitle)}</h1><p><strong>${lang === 'zh' ? '来源 + 原创解读 + 企业实际价值' : 'Source + interpretation + business value'}</strong></p><p class="notice">${esc(m.policyNotice)}</p></section><section class="grid">${cards || `<div class="card"><p>${esc(m.newsEmpty)}</p></div>`}</section>`;
    return layout(`${m.newsTitle}｜${siteName(env, lang)}`, m.newsDesc, body, `${origin}/news`, env, request, lang);
  }

  if (request.method === 'GET' && url.pathname === '/wechat') {
    const rows = await publishedWechat(db, 40, lang).catch(() => []);
    const cards = rows.map((row) => {
      const data = dataOf(row);
      const summary = String(data.summary || '');
      const account = String(data.accountName || '');
      const cover = String(data.coverUrl || '');
      const slug = row.slug || row.id;
      const coverHtml = cover ? `<img class="cover" src="${esc(cover)}" alt="" loading="lazy">` : '';
      return `<article class="card">${coverHtml}<span class="tag">${esc(m.navWechat)}</span>${account ? `<span class="muted">${esc(m.wechatAccount)}：${esc(account)}</span>` : ''}<h2><a href="/wechat/${encodeURIComponent(slug)}${lang !== 'zh' ? `?lang=${lang}` : ''}">${esc(row.title || m.wechatTitle)}</a></h2><p>${esc(summary.slice(0, 160))}</p><a href="/wechat/${encodeURIComponent(slug)}${lang !== 'zh' ? `?lang=${lang}` : ''}">${esc(m.newsReadMore)}</a></article>`;
    }).join('');
    const body = `<section class="card"><h1>${esc(m.wechatTitle)}</h1><p>${esc(m.wechatDesc)}</p></section><section class="grid">${cards || `<div class="card"><p>${esc(m.wechatEmpty)}</p></div>`}</section>`;
    return layout(`${m.wechatTitle}｜${siteName(env, lang)}`, m.wechatDesc, body, `${origin}/wechat`, env, request, lang);
  }

  if (request.method === 'GET' && url.pathname.startsWith('/wechat/')) {
    const slug = decodeURIComponent(url.pathname.slice('/wechat/'.length)).trim();
    if (slug) {
      const row = await articleBySlug(db, 'wechat_article', slug).catch(() => null);
      if (row) {
        const data = dataOf(row);
        const summary = String(data.summary || '').slice(0, 200);
        const account = String(data.accountName || '');
        const author = String(data.author || '');
        const cover = String(data.coverUrl || '');
        const originalUrl = String(data.originalUrl || '');
        const extra = richText(data.content || '');
        const coverHtml = cover ? `<img class="cover" src="${esc(cover)}" alt="" style="max-height:280px">` : '';
        const body = `<article class="card">${coverHtml}<span class="tag">${esc(m.navWechat)}</span><h1>${esc(row.title || m.wechatTitle)}</h1>
          <p class="muted">${account ? `${esc(m.wechatAccount)}：${esc(account)}` : ''}${author ? ` · ${esc(author)}` : ''}</p>
          ${summary ? `<p>${esc(summary)}</p>` : ''}
          ${extra ? `<div>${extra}</div>` : ''}
          ${originalUrl ? `<p style="margin-top:20px"><a class="btn" href="${esc(originalUrl)}" rel="nofollow noopener" target="_blank">${esc(m.wechatOpenOriginal)}</a></p>` : ''}
        </article>`;
        return layout(`${row.title || m.wechatTitle}｜${siteName(env, lang)}`, summary || m.wechatDesc, body, `${origin}/wechat/${encodeURIComponent(slug)}`, env, request, lang);
      }
    }
  }

  if (request.method === 'GET' && url.pathname === '/search') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    if (!q) {
      return layout(`${m.navSearch}｜${siteName(env, lang)}`, m.searchPlaceholder, `<section class="card"><h1>${esc(m.navSearch)}</h1><p>${esc(m.searchPlaceholder)}</p></section>`, `${origin}/search`, env, request, lang);
    }
    const rows = await db.prepare(`
      SELECT id, slug, title, data, published_at, updated_at, type_id
      FROM documents
      WHERE tenant_id = 'default' AND type_id IN ('seo_article','wechat_article') AND is_published = 1 AND deleted_at IS NULL
        AND (title LIKE ? OR data LIKE ?)
      ORDER BY COALESCE(published_at, updated_at) DESC
      LIMIT 30
    `).bind(`%${q}%`, `%${q}%`).all<DocumentRow & { type_id?: string }>().then((r) => r.results || []).catch(() => []);
    const cards = rows.map((row) => {
      const isWechat = (row as { type_id?: string }).type_id === 'wechat_article';
      const path = isWechat ? `/wechat/${encodeURIComponent(row.slug || row.id)}` : `/article/${encodeURIComponent(row.slug || row.id)}`;
      return `<article class="card"><span class="tag">${esc(isWechat ? m.navWechat : m.navNews)}</span><h2><a href="${path}${lang !== 'zh' ? `?lang=${lang}` : ''}">${esc(row.title || '')}</a></h2><p>${esc(String(dataOf(row).summary || '').slice(0, 180))}</p></article>`;
    }).join('');
    return layout(`“${q}” ${m.searchResults}｜${siteName(env, lang)}`, `${m.searchResults}: ${q}`, `<section class="card"><h1>“${esc(q)}” ${esc(m.searchResults)}</h1><p class="muted">${rows.length}</p></section><section class="grid">${cards || `<div class="card"><p>${esc(m.noResults)}</p></div>`}</section>`, `${origin}/search?q=${encodeURIComponent(q)}`, env, request, lang);
  }

  if (request.method === 'GET' && url.pathname.startsWith('/article/')) {
    const slug = decodeURIComponent(url.pathname.slice('/article/'.length)).trim();
    if (slug) {
      const row = await articleBySlug(db, 'seo_article', slug).catch(() => null);
      if (row) {
        const data = dataOf(row);
        const title = String(data.seoTitle || data.seo_title || row.title || m.newsTitle);
        const description = String(data.seoDescription || data.seo_description || data.summary || '').slice(0, 180);
        const sourceName = String(data.sourceName || data.source_name || (lang === 'zh' ? '公开政策来源' : 'Official source'));
        const sourceUrl = String(data.sourceUrl || data.source_url || '');
        const interpretation = richText(data.interpretation || data.originalInterpretation || data.content || '');
        const businessValue = richText(data.businessValue || '');
        const body = `<article class="card"><span class="tag">${esc(m.navNews)}</span><h1>${esc(row.title || title)}</h1><p class="muted">${esc(m.source)}：${esc(sourceName)}${sourceUrl ? ` · <a href="${esc(sourceUrl)}" rel="nofollow noopener" target="_blank">link</a>` : ''}</p><hr><h2>${esc(m.interpretation)}</h2><div>${interpretation || '<p>—</p>'}</div><h2>${esc(m.businessValue)}</h2><div>${businessValue || '<p>—</p>'}</div><p class="notice">${esc(m.policyNotice)}</p></article>`;
        return layout(`${title}｜${siteName(env, lang)}`, description, body, `${origin}/article/${encodeURIComponent(slug)}`, env, request, lang);
      }
    }
  }

  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    const articles = await publishedArticles(db, 500).catch(() => []);
    const wechat = await publishedWechat(db, 500).catch(() => []);
    const articleUrls = articles.map((row) => `${origin}/article/${encodeURIComponent(row.slug || row.id)}`);
    const wechatUrls = wechat.map((row) => `${origin}/wechat/${encodeURIComponent(row.slug || row.id)}`);
    const urls = [
      `${origin}/`,
      `${origin}/news`,
      `${origin}/wechat`,
      `${origin}/search`,
      `${origin}/contact`,
      ...SEO_CITIES.map((city) => `${origin}/city/${encodeURIComponent(city.name)}`),
      ...articleUrls,
      ...wechatUrls,
    ];
    const unique = [...new Set(urls)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${unique.map((item) => `<url><loc>${esc(item)}</loc></url>`).join('')}</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
  }

  return fallback();
}
