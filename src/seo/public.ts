import { SEO_CITIES } from './cities';
import { adminSettingsRoutes } from '@sonicjs-cms/core';
import { detectLanguage, languageCookieHeader, supportedLanguages, type LanguageCode } from '../i18n/config';
import { t } from '../i18n/messages';

type SeoEnv = {
  DB?: D1Database;
  SITE_NAME?: string;
  CONTACT_PHONE?: string;
  INDEXNOW_KEY?: string;
};

const SETTINGS_TYPE = 'site_settings';
const SETTINGS_TENANT = 'default';

const esc = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const siteName = (env: SeoEnv, lang: LanguageCode) => env.SITE_NAME || t(lang).siteName;

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
  return `<div class="lang">${t(lang).language}: ${options}</div>`;
}

function mainNav(origin: string, lang: LanguageCode): string {
  const m = t(lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  return `<nav class="nav">
    <a href="/${q}">${esc(m.navHome)}</a>
    <a href="/news${q}">${esc(m.navNews)}</a>
    <a href="/wechat${q}">${esc(m.navWechat)}</a>
    <a href="/contact${q}">${esc(m.navContact)}</a>
  </nav>`;
}

const page = (title: string, description: string, body: string, env: SeoEnv, request: Request, lang: LanguageCode, canonical?: string) => {
  const canonicalTag = canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '';
  const htmlLang = lang === 'zh' ? 'zh-CN' : lang;
  const m = t(lang);
  return new Response(`<!doctype html>
<html lang="${htmlLang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonicalTag}
<meta name="robots" content="index,follow">
<style>
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#172033;background:#f6f8fb;line-height:1.75}
header{background:#0b3b82;color:#fff;padding:18px 5%}
header .top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
header a{color:#fff;text-decoration:none;margin-right:12px}
.lang a{color:#cfe0ff;font-size:13px}
.nav{margin-top:10px}.nav a{margin-right:14px}
main{max-width:1180px;margin:auto;padding:28px 18px}h1,h2{line-height:1.35}
.hero{background:#fff;border-radius:16px;padding:30px;box-shadow:0 6px 24px #10204012;margin-bottom:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.city{display:block;background:#fff;padding:12px;border-radius:10px;text-decoration:none;color:#0b3b82;border:1px solid #e7ebf2}
.btn{display:inline-block;background:#0b3b82;color:#fff;padding:11px 18px;border-radius:9px;text-decoration:none;border:0}
.muted{color:#667085}.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:14px 16px;border-radius:8px}
.form{display:grid;gap:12px;max-width:620px}.form input,.form textarea{padding:12px;border:1px solid #d7dce5;border-radius:8px;font-size:16px}
.footer{margin-top:40px;padding:25px 0;color:#667085;font-size:14px}
</style></head><body>
<header><div class="top"><strong>${esc(siteName(env, lang))}</strong>${langSwitcher(request, lang)}</div>${mainNav(new URL(request.url).origin, lang)}</header>
<main>${body}
<div class="footer">${esc(m.footer)}</div></main></body></html>`, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'set-cookie': languageCookieHeader(lang),
    },
  });
};

const cityUrl = (request: Request, name: string) => `${new URL(request.url).origin}/city/${encodeURIComponent(name)}`;

async function getStoredSettings(db: D1Database, category: string): Promise<Record<string, any>> {
  try {
    const row = await db.prepare(`SELECT data FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`).bind(SETTINGS_TYPE, category, SETTINGS_TENANT).first() as { data?: string } | null;
    return row?.data ? JSON.parse(row.data) : {};
  } catch (error) {
    console.warn(`[tax-seo-settings] read ${category} failed`, error);
    return {};
  }
}

async function saveStoredSettings(db: D1Database, category: string, incoming: Record<string, any>): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const existing = await getStoredSettings(db, category);
    const merged = { ...existing, ...incoming };
    const jsonData = JSON.stringify(merged);
    await db.prepare(`INSERT OR IGNORE INTO document_types (id, name, display_name, description, schema, source, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(SETTINGS_TYPE, SETTINGS_TYPE, 'Site Settings', 'Global site configuration settings', '{}', 'system', 1, 1, now, now).run();
    const row = await db.prepare(`SELECT id FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`).bind(SETTINGS_TYPE, category, SETTINGS_TENANT).first() as { id?: string } | null;
    if (row?.id) {
      await db.prepare(`UPDATE documents SET data = ?, updated_at = ? WHERE id = ? AND is_current_draft = 1`).bind(jsonData, now, row.id).run();
    } else {
      const id = crypto.randomUUID();
      const title = category === 'seo' ? 'SEO Settings' : 'Lead Settings';
      await db.prepare(`INSERT INTO documents (id, root_id, type_id, version_number, is_current_draft, is_published, status, parent_root_id, slug, title, tenant_id, locale, translation_group_id, data, metadata, created_at, updated_at) VALUES (?, ?, ?, 1, 1, 1, 'published', '', ?, ?, ?, 'default', '', ?, '{}', ?, ?)`).bind(id, id, SETTINGS_TYPE, category, title, SETTINGS_TENANT, jsonData, now, now).run();
    }
    return true;
  } catch (error) {
    console.error(`[tax-seo-settings] save ${category} failed`, error);
    return false;
  }
}

// These routes are attached before createSonicJSApp() mounts adminSettingsRoutes.
// They reuse the existing documents/site_settings storage and add no migration.
adminSettingsRoutes.get('/api/seo', async (c) => {
  const settings = await getStoredSettings(c.env.DB, 'seo');
  return c.json({
    success: true,
    data: {
      seoTitle: settings.seoTitle || '全国财税发票服务｜财税与发票咨询',
      seoKeywords: settings.seoKeywords || '发票,财税,税务咨询,增值税发票,全国财税服务',
      seoDescription: settings.seoDescription || '提供合法合规的财税、发票及税务咨询服务信息，覆盖全国城市。',
      canonicalUrl: settings.canonicalUrl || 'https://szfp8.com',
      robots: settings.robots || 'index,follow',
      indexNowEnabled: settings.indexNowEnabled !== false,
    },
  });
});

adminSettingsRoutes.post('/api/seo', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const data = {
    seoTitle: String(body.seoTitle || '').slice(0, 180),
    seoKeywords: String(body.seoKeywords || '').slice(0, 500),
    seoDescription: String(body.seoDescription || '').slice(0, 500),
    canonicalUrl: String(body.canonicalUrl || '').slice(0, 300),
    robots: String(body.robots || 'index,follow').slice(0, 100),
    indexNowEnabled: body.indexNowEnabled !== false,
  };
  const ok = await saveStoredSettings(c.env.DB, 'seo', data);
  return c.json(ok ? { success: true, message: 'SEO设置已保存' } : { success: false, error: 'SEO设置保存失败' }, ok ? 200 : 500);
});

adminSettingsRoutes.get('/api/lead', async (c) => {
  const settings = await getStoredSettings(c.env.DB, 'lead');
  return c.json({
    success: true,
    data: {
      contactPhone: settings.contactPhone || '',
      wechat: settings.wechat || '',
      leadEnabled: settings.leadEnabled !== false,
      leadMessage: settings.leadMessage || '请通过正规渠道提交真实业务需求，我们将为您提供合法合规的财税服务咨询。',
    },
  });
});

adminSettingsRoutes.post('/api/lead', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const data = {
    contactPhone: String(body.contactPhone || '').slice(0, 80),
    wechat: String(body.wechat || '').slice(0, 120),
    leadEnabled: body.leadEnabled !== false,
    leadMessage: String(body.leadMessage || '').slice(0, 500),
  };
  const ok = await saveStoredSettings(c.env.DB, 'lead', data);
  return c.json(ok ? { success: true, message: '获客设置已保存' } : { success: false, error: '获客设置保存失败' }, ok ? 200 : 500);
});

function home(request: Request, env: SeoEnv, lang: LanguageCode) {
  const origin = new URL(request.url).origin;
  const m = t(lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  const links = SEO_CITIES.map((city) => `<a class="city" href="${cityUrl(request, city.name)}">${esc(city.name)}${lang === 'zh' ? '发票/财税服务' : ''}</a>`).join('');
  return page(
    `${siteName(env, lang)}｜${m.homeTitle}`,
    m.homeDesc,
    `<section class="hero"><h1>${esc(m.homeHeroTitle)}</h1><p>${esc(m.homeHeroBody)}</p><p class="notice">${esc(m.homeNotice)}</p><a class="btn" href="${origin}/contact${q}">${esc(m.homeContactBtn)}</a></section>
<section class="hero"><h2>${esc(m.homeCitiesTitle)}</h2><div class="grid">${links}</div></section>
<section class="hero"><h2>${esc(m.homeNewsTitle)}</h2><p>${esc(m.homeNewsBody)}</p><a class="btn" href="${origin}/news${q}">${esc(m.homeNewsBtn)}</a></section>
<section class="hero"><h2>${esc(m.homeWechatTitle)}</h2><p>${esc(m.homeWechatBody)}</p><a class="btn" href="${origin}/wechat${q}">${esc(m.homeWechatBtn)}</a></section>`,
    env,
    request,
    lang,
    origin,
  );
}

function cityPage(request: Request, env: SeoEnv, cityName: string, lang: LanguageCode) {
  const match = SEO_CITIES.find((item) => item.name === cityName);
  const province = match?.province || (lang === 'zh' ? '全国' : 'Nationwide');
  const title = lang === 'zh'
    ? `${cityName}开票/发票/税务/财税咨询｜${siteName(env, lang)}`
    : `${cityName} invoice & tax consulting｜${siteName(env, lang)}`;
  const description = lang === 'zh'
    ? `提供${cityName}及周边企业、个人的发票与税务流程咨询，说明常见材料、办理步骤和合规注意事项。`
    : `Invoice and tax process guidance for businesses and individuals in ${cityName}.`;
  const m = t(lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  return page(title, description,
    `<section class="hero"><h1>${esc(cityName)}${lang === 'zh' ? '发票与财税服务' : ' Invoice & Tax Services'}</h1><p>${lang === 'zh' ? '服务地区' : 'Region'}：${esc(province)} · ${esc(cityName)}</p><p class="notice">${esc(m.homeNotice)}</p><a class="btn" href="/contact?city=${encodeURIComponent(cityName)}${lang !== 'zh' ? `&lang=${lang}` : ''}">${esc(m.homeContactBtn)}</a></section>
<section class="hero"><h2>${esc(m.homeCitiesTitle)}</h2><div class="grid">${SEO_CITIES.slice(0, 48).map((item) => `<a class="city" href="${cityUrl(request, item.name)}">${esc(item.name)}</a>`).join('')}</div></section>`,
    env, request, lang, cityUrl(request, cityName),
  );
}

function contactPage(request: Request, env: SeoEnv, lang: LanguageCode) {
  const city = new URL(request.url).searchParams.get('city') || '';
  const m = t(lang);
  return page(`${m.contactTitle}｜${siteName(env, lang)}`, m.contactDesc,
    `<section class="hero"><h1>${esc(m.contactTitle)}</h1><p class="muted">${esc(m.contactDesc)}</p><form class="form" method="post" action="/api/lead"><input name="city" value="${esc(city)}" placeholder="${esc(m.contactCity)}"><input name="name" required placeholder="${esc(m.contactName)}"><input name="phone" required placeholder="${esc(m.contactPhone)}"><textarea name="need" required rows="6" placeholder="${esc(m.contactNeed)}"></textarea><input type="hidden" name="lang" value="${esc(lang)}"><button class="btn" type="submit">${esc(m.contactSubmit)}</button></form>${env.CONTACT_PHONE ? `<p>${esc(m.contactPhone)}：${esc(env.CONTACT_PHONE)}</p>` : ''}</section>`, env, request, lang);
}

function newsPage(env: SeoEnv, request: Request, lang: LanguageCode) {
  // Prefer enhanced handler for /news when DB is available; this is a static fallback.
  const m = t(lang);
  const origin = new URL(request.url).origin;
  return page(`${m.newsTitle}｜${siteName(env, lang)}`, m.newsDesc,
    `<section class="hero"><h1>${esc(m.newsTitle)}</h1><p>${esc(m.newsDesc)}</p><p class="notice">${esc(m.policyNotice)}</p><a class="btn" href="${origin}/">${esc(m.backHome)}</a></section>`, env, request, lang);
}

async function saveLead(request: Request, env: SeoEnv) {
  if (!env.DB) return new Response('Database binding DB is not configured.', { status: 503 });
  const form = await request.formData();
  const city = String(form.get('city') || '').slice(0, 80);
  const name = String(form.get('name') || '').slice(0, 120);
  const phone = String(form.get('phone') || '').slice(0, 80);
  const need = String(form.get('need') || '').slice(0, 4000);
  const langRaw = String(form.get('lang') || 'zh').slice(0, 2);
  const lang = (langRaw in supportedLanguages ? langRaw : 'zh') as LanguageCode;
  const m = t(lang);
  if (!name || !phone || !need) return new Response(lang === 'zh' ? '请完整填写咨询信息。' : 'Please fill in all fields.', { status: 400 });
  await env.DB.prepare('INSERT INTO seo_leads (city, name, phone, need, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').bind(city, name, phone, need).run();
  return page(m.contactSuccess, m.contactSuccess, `<section class="hero"><h1>${esc(m.contactSuccess)}</h1><p>${lang === 'zh' ? '我们已收到你的咨询需求。' : 'We have received your inquiry.'}</p><a class="btn" href="/">${esc(m.backHome)}</a></section>`, env, request, lang);
}

export async function handleSeoRequest(request: Request, env: SeoEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const lang = detectLanguage(request);

  if (request.method === 'GET' && url.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
  }
  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    // Let enhanced handler build full sitemap when available; minimal fallback here
    const urls = [`${url.origin}/`, `${url.origin}/news`, `${url.origin}/wechat`, `${url.origin}/contact`, ...SEO_CITIES.map((city) => cityUrl(request, city.name))];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('')}</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
  }
  if (request.method === 'GET' && env.INDEXNOW_KEY && url.pathname === `/${env.INDEXNOW_KEY}.txt`) {
    return new Response(env.INDEXNOW_KEY, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
  }
  if (request.method === 'GET' && url.pathname === '/') return home(request, env, lang);
  if (request.method === 'GET' && url.pathname === '/news') return newsPage(env, request, lang);
  if (request.method === 'GET' && url.pathname === '/contact') return contactPage(request, env, lang);
  if (request.method === 'POST' && url.pathname === '/api/lead') return saveLead(request, env);
  if (request.method === 'GET' && url.pathname.startsWith('/city/')) {
    const city = decodeURIComponent(url.pathname.slice('/city/'.length)).trim();
    if (city) return cityPage(request, env, city, lang);
  }
  return null;
}

export async function pingIndexNow(request: Request, env: SeoEnv) {
  if (!env.INDEXNOW_KEY) return;
  const origin = new URL(request.url).origin;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(origin).host,
        key: env.INDEXNOW_KEY,
        keyLocation: `${origin}/${env.INDEXNOW_KEY}.txt`,
        urlList: [`${origin}/`, `${origin}/sitemap.xml`, `${origin}/wechat`],
      }),
    });
  } catch (error) {
    console.warn('[indexnow] ping failed', error);
  }
}
