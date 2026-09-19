import { SEO_CITIES } from './cities';
import { detectLanguage, languageCookieHeader, type LanguageCode } from '../i18n/config';
import { t } from '../i18n/messages';
import { CONTACT_BAR_CSS, contactBarHtml, loadContacts } from './contacts';

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

const esc = (value: string) =>
  value
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
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function langQuery(lang: LanguageCode): string {
  return lang === 'zh' ? '' : `?lang=${lang}`;
}

const PAGE_CSS = `
:root{--brand:#2563eb;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f1f5f9;--card:#fff}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg);line-height:1.7}
a{color:inherit;text-decoration:none}.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.header-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--brand)}
.brand-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;display:grid;place-items:center;font-size:14px}
.brand small{display:block;font-weight:500;color:var(--muted);font-size:11px}
.nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;font-weight:600;color:#334155}
.nav a:hover{color:var(--brand)}
.header-actions{display:flex;align-items:center;gap:12px}
.phone{color:var(--brand);font-weight:800;font-size:14px}
main.wrap{padding:24px 20px 40px}
.section{background:var(--card);border-radius:20px;padding:28px;margin-bottom:22px;border:1px solid var(--line);box-shadow:0 6px 20px rgba(15,23,42,.04)}
.section h1{margin:0 0 10px;font-size:26px}.section h2{margin:0 0 8px;font-size:18px}
.muted{color:var(--muted);font-size:13px}.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:12px 14px;border-radius:8px;margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px}
.card h2{margin:8px 0;font-size:17px}.card h2 a{color:var(--ink)}.card h2 a:hover{color:var(--brand)}
.tag{display:inline-block;padding:4px 9px;border-radius:999px;background:#eff6ff;color:var(--brand);font-size:12px;font-weight:700;margin-right:6px}
.btn{display:inline-block;background:var(--brand);color:#fff!important;padding:9px 16px;border-radius:10px;font-weight:700}
.cover{width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:10px}
.footer{padding:20px 0 40px;color:var(--muted);font-size:13px;text-align:center}
.mobile-tab{display:none}
${CONTACT_BAR_CSS}
@media(max-width:640px){.nav{display:none}.mobile-tab{display:flex;position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:8px 0 env(safe-area-inset-bottom);justify-content:space-around;z-index:60}.mobile-tab a{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:#64748b;font-weight:600}.mobile-tab a.active{color:var(--brand)}body{padding-bottom:64px}}
`;

async function layout(
  title: string,
  description: string,
  body: string,
  canonical: string,
  env: Env,
  request: Request,
  lang: LanguageCode,
  activeNav?: string,
): Promise<Response> {
  const m = t(lang);
  const q = langQuery(lang);
  const contacts = await loadContacts(env.DB);
  const phone = contacts.contactPhone || m.phoneDisplay;
  const name = siteName(env, lang);
  const htmlLang = lang === 'zh' ? 'zh-CN' : lang;
  // 不展示多语言切换
  const html = `<!doctype html><html lang="${htmlLang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow">
<style>${PAGE_CSS}</style></head><body>
<header class="site-header"><div class="wrap header-inner">
  <a class="brand" href="/${q}"><span class="brand-mark">税</span><span>${esc(name)}<small>${esc(m.siteTagline)}</small></span></a>
  <nav class="nav">
    <a href="/${q}">${esc(m.navHome)}</a>
    <a href="/#services">${esc(m.navServices)}</a>
    <a href="/#cities">${esc(m.navCities)}</a>
    <a href="/news${q}">${esc(m.navNews)}</a>
    <a href="/contact${q}">${esc(m.navContact)}</a>
  </nav>
  <div class="header-actions">
    <a class="phone" href="tel:${esc(phone.replace(/\s/g, ''))}">☎ ${esc(phone)}</a>
  </div>
</div></header>
<main class="wrap">${body}</main>
<footer class="footer"><div class="wrap">${esc(m.footer)}</div></footer>
${contactBarHtml(contacts, m.phoneDisplay)}
<nav class="mobile-tab">
  <a class="${activeNav === 'home' ? 'active' : ''}" href="/${q}"><span>🏠</span>${esc(m.navHome)}</a>
  <a href="/#services"><span>📋</span>${esc(m.navServices)}</a>
  <a class="${activeNav === 'news' ? 'active' : ''}" href="/news${q}"><span>📰</span>${esc(m.navNews)}</a>
  <a class="${activeNav === 'contact' ? 'active' : ''}" href="/contact${q}"><span>☎</span>${esc(m.navContact)}</a>
</nav>
</body></html>`;
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'set-cookie': languageCookieHeader(lang),
    },
  });
}

async function publishedByType(db: D1Database, typeName: string, limit: number): Promise<DocumentRow[]> {
  try {
    const byName = await db
      .prepare(
        `SELECT d.id, d.slug, d.title, d.data, d.published_at, d.updated_at
         FROM documents d
         WHERE d.tenant_id = 'default' AND d.is_published = 1 AND d.deleted_at IS NULL
           AND (d.type_id = ? OR d.type_id IN (SELECT id FROM document_types WHERE name = ?))
         ORDER BY COALESCE(d.published_at, d.updated_at) DESC, d.id DESC
         LIMIT ?`,
      )
      .bind(typeName, typeName, limit)
      .all<DocumentRow>();
    if (byName.results?.length) return byName.results;
  } catch {
    /* fallback */
  }
  const result = await db
    .prepare(
      `SELECT id, slug, title, data, published_at, updated_at FROM documents
       WHERE tenant_id = 'default' AND type_id = ? AND is_published = 1 AND deleted_at IS NULL
       ORDER BY COALESCE(published_at, updated_at) DESC LIMIT ?`,
    )
    .bind(typeName, limit)
    .all<DocumentRow>();
  return result.results || [];
}

async function articleBySlug(db: D1Database, typeName: string, slug: string): Promise<DocumentRow | null> {
  try {
    const row = await db
      .prepare(
        `SELECT d.id, d.slug, d.title, d.data, d.published_at, d.updated_at FROM documents d
         WHERE d.tenant_id = 'default' AND d.slug = ? AND d.is_published = 1 AND d.deleted_at IS NULL
           AND (d.type_id = ? OR d.type_id IN (SELECT id FROM document_types WHERE name = ?))
         LIMIT 1`,
      )
      .bind(slug, typeName, typeName)
      .first<DocumentRow>();
    if (row) return row;
  } catch {
    /* */
  }
  return db
    .prepare(
      `SELECT id, slug, title, data, published_at, updated_at FROM documents
       WHERE tenant_id = 'default' AND type_id = ? AND slug = ? AND is_published = 1 AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(typeName, slug)
    .first<DocumentRow>();
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
  const q = langQuery(lang);

  if (request.method === 'GET' && url.pathname === '/news') {
    const articles = await publishedByType(db, 'seo_article', 30).catch(() => []);
    const cards = articles
      .map((row) => {
        const data = dataOf(row);
        const summary = String(data.summary || data.seoDescription || '');
        const source = String(data.sourceName || (lang === 'zh' ? '公开政策来源' : 'Official source'));
        const slug = row.slug || row.id;
        return `<article class="card"><span class="tag">${esc(m.navNews)}</span><span class="muted">${esc(m.source)}：${esc(source)}</span><h2><a href="/article/${encodeURIComponent(slug)}${q}">${esc(row.title || m.newsTitle)}</a></h2><p class="muted">${esc(summary.slice(0, 180))}</p><a href="/article/${encodeURIComponent(slug)}${q}">${esc(m.newsReadMore)}</a></article>`;
      })
      .join('');
    const body = `<section class="section"><h1>${esc(m.newsTitle)}</h1><p class="muted">${lang === 'zh' ? '来源 + 原创解读 + 企业实际价值' : 'Source + interpretation + business value'}</p><p class="notice">${esc(m.policyNotice)}</p></section><section class="grid">${cards || `<div class="card"><p>${esc(m.newsEmpty)}</p></div>`}</section>`;
    return layout(`${m.newsTitle}｜${siteName(env, lang)}`, m.newsDesc, body, `${origin}/news`, env, request, lang, 'news');
  }

  if (request.method === 'GET' && url.pathname === '/wechat') {
    const rows = await publishedByType(db, 'wechat_article', 40).catch(() => []);
    const cards = rows
      .map((row) => {
        const data = dataOf(row);
        const summary = String(data.summary || '');
        const account = String(data.accountName || '');
        const cover = String(data.coverUrl || '');
        const slug = row.slug || row.id;
        const coverHtml = cover ? `<img class="cover" src="${esc(cover)}" alt="" loading="lazy">` : '';
        return `<article class="card">${coverHtml}<span class="tag">${esc(m.navWechat)}</span>${account ? `<span class="muted">${esc(m.wechatAccount)}：${esc(account)}</span>` : ''}<h2><a href="/wechat/${encodeURIComponent(slug)}${q}">${esc(row.title || m.wechatTitle)}</a></h2><p class="muted">${esc(summary.slice(0, 160))}</p><a href="/wechat/${encodeURIComponent(slug)}${q}">${esc(m.newsReadMore)}</a></article>`;
      })
      .join('');
    const body = `<section class="section"><h1>${esc(m.wechatTitle)}</h1><p class="muted">${esc(m.wechatDesc)}</p></section><section class="grid">${cards || `<div class="card"><p>${esc(m.wechatEmpty)}</p></div>`}</section>`;
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
        const body = `<article class="section">${coverHtml}<span class="tag">${esc(m.navWechat)}</span><h1>${esc(row.title || m.wechatTitle)}</h1>
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
    const searchQ = (url.searchParams.get('q') || '').trim().slice(0, 80);
    if (!searchQ) {
      return layout(
        `${m.navSearch}｜${siteName(env, lang)}`,
        m.searchPlaceholder,
        `<section class="section"><h1>${esc(m.navSearch)}</h1><p class="muted">${esc(m.searchPlaceholder)}</p>
        <form action="/search" method="get" style="margin-top:16px;display:flex;gap:8px;max-width:480px"><input name="q" style="flex:1;padding:12px;border:1px solid var(--line);border-radius:10px" placeholder="${esc(m.searchPlaceholder)}" /><button class="btn" type="submit">${esc(m.navSearch)}</button></form></section>`,
        `${origin}/search`,
        env,
        request,
        lang,
      );
    }
    const rows = await db
      .prepare(
        `SELECT id, slug, title, data, published_at, updated_at, type_id FROM documents
         WHERE tenant_id = 'default' AND is_published = 1 AND deleted_at IS NULL
           AND (type_id IN ('seo_article','wechat_article') OR type_id IN (SELECT id FROM document_types WHERE name IN ('seo_article','wechat_article')))
           AND (title LIKE ? OR data LIKE ?)
         ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 30`,
      )
      .bind(`%${searchQ}%`, `%${searchQ}%`)
      .all<DocumentRow & { type_id?: string }>()
      .then((r) => r.results || [])
      .catch(() => []);
    const cards = rows
      .map((row) => {
        const isWechat = String((row as { type_id?: string }).type_id || '').includes('wechat');
        const path = isWechat
          ? `/wechat/${encodeURIComponent(row.slug || row.id)}`
          : `/article/${encodeURIComponent(row.slug || row.id)}`;
        return `<article class="card"><span class="tag">${esc(isWechat ? m.navWechat : m.navNews)}</span><h2><a href="${path}${q}">${esc(row.title || '')}</a></h2><p class="muted">${esc(String(dataOf(row).summary || '').slice(0, 180))}</p></article>`;
      })
      .join('');
    return layout(
      `“${searchQ}” ${m.searchResults}｜${siteName(env, lang)}`,
      `${m.searchResults}: ${searchQ}`,
      `<section class="section"><h1>“${esc(searchQ)}” ${esc(m.searchResults)}</h1><p class="muted">共 ${rows.length} 条</p></section><section class="grid">${cards || `<div class="card"><p>${esc(m.noResults)}</p></div>`}</section>`,
      `${origin}/search?q=${encodeURIComponent(searchQ)}`,
      env,
      request,
      lang,
    );
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
        const body = `<article class="section"><span class="tag">${esc(m.navNews)}</span><h1>${esc(row.title || title)}</h1><p class="muted">${esc(m.source)}：${esc(sourceName)}${sourceUrl ? ` · <a href="${esc(sourceUrl)}" rel="nofollow noopener" target="_blank">原文</a>` : ''}</p><hr style="border:0;border-top:1px solid var(--line);margin:16px 0"><h2>${esc(m.interpretation)}</h2><div>${interpretation || '<p>—</p>'}</div><h2>${esc(m.businessValue)}</h2><div>${businessValue || '<p>—</p>'}</div><p class="notice">${esc(m.policyNotice)}</p></article>`;
        return layout(`${title}｜${siteName(env, lang)}`, description, body, `${origin}/article/${encodeURIComponent(slug)}`, env, request, lang, 'news');
      }
    }
  }

  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    const articles = await publishedByType(db, 'seo_article', 500).catch(() => []);
    const wechat = await publishedByType(db, 'wechat_article', 500).catch(() => []);
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
