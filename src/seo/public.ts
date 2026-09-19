import { SEO_CITIES } from './cities';
import { adminSettingsRoutes } from '@sonicjs-cms/core';
import { detectLanguage, languageCookieHeader, type LanguageCode } from '../i18n/config';
import { t } from '../i18n/messages';
import { CONTACT_BAR_CSS, contactBarHtml, loadContacts } from './contacts';
import { assertLeadRateLimit } from '../security';

type SeoEnv = {
  DB?: D1Database;
  SITE_NAME?: string;
  CONTACT_PHONE?: string;
  INDEXNOW_KEY?: string;
  CACHE_KV?: {
    get: (k: string) => Promise<string | null>;
    put: (k: string, v: string, o?: { expirationTtl?: number }) => Promise<void>;
  };
};
const SETTINGS_TYPE = 'site_settings';
const SETTINGS_TENANT = 'default';
const esc = (v: string) =>
  v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

type HomeSettings = {
  siteName: string;
  homeTitle: string;
  homeIntro: string;
  homeNotice: string;
  navHome: string;
  navNews: string;
  navWechat: string;
  navContact: string;
  navSearch: string;
  showCities: boolean;
  showNewsBlock: boolean;
  showWechatBlock: boolean;
  contactPhone: string;
};

function defaultHomeSettings(lang: LanguageCode, env: SeoEnv): HomeSettings {
  const m = t(lang);
  return {
    siteName: env.SITE_NAME || m.siteName,
    homeTitle: m.homeHeroTitle,
    homeIntro: m.homeHeroBody,
    homeNotice: m.homeNotice,
    navHome: m.navHome,
    navNews: m.navNews,
    navWechat: m.navWechat,
    navContact: m.navContact,
    navSearch: m.navSearch,
    showCities: true,
    showNewsBlock: true,
    showWechatBlock: true,
    contactPhone: env.CONTACT_PHONE || m.phoneDisplay,
  };
}

async function getStoredSettings(db: D1Database, category: string): Promise<Record<string, any>> {
  try {
    const row = await db
      .prepare(
        `SELECT data FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
      )
      .bind(SETTINGS_TYPE, category, SETTINGS_TENANT)
      .first() as { data?: string } | null;
    return row?.data ? JSON.parse(row.data) : {};
  } catch {
    return {};
  }
}

async function saveStoredSettings(db: D1Database, category: string, incoming: Record<string, any>): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const existing = await getStoredSettings(db, category);
    const jsonData = JSON.stringify({ ...existing, ...incoming });
    await db
      .prepare(
        `INSERT OR IGNORE INTO document_types (id, name, display_name, description, schema, source, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(SETTINGS_TYPE, SETTINGS_TYPE, 'Site Settings', 'Global', '{}', 'system', 1, 1, now, now)
      .run();
    const row = await db
      .prepare(
        `SELECT id FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
      )
      .bind(SETTINGS_TYPE, category, SETTINGS_TENANT)
      .first() as { id?: string } | null;
    if (row?.id) {
      await db
        .prepare(`UPDATE documents SET data = ?, updated_at = ? WHERE id = ? AND is_current_draft = 1`)
        .bind(jsonData, now, row.id)
        .run();
    } else {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO documents (id, root_id, type_id, version_number, is_current_draft, is_published, status, parent_root_id, slug, title, tenant_id, locale, translation_group_id, data, metadata, created_at, updated_at) VALUES (?, ?, ?, 1, 1, 1, 'published', '', ?, ?, ?, 'default', '', ?, '{}', ?, ?)`,
        )
        .bind(id, id, SETTINGS_TYPE, category, category, SETTINGS_TENANT, jsonData, now, now)
        .run();
    }
    return true;
  } catch (e) {
    console.error('[settings] save failed', e);
    return false;
  }
}

async function loadHomeSettings(env: SeoEnv, lang: LanguageCode): Promise<HomeSettings> {
  const base = defaultHomeSettings(lang, env);
  if (!env.DB) return base;
  const raw = await getStoredSettings(env.DB, 'home').catch(() => ({}));
  const lead = await getStoredSettings(env.DB, 'lead').catch(() => ({}));
  return {
    siteName: String(raw.siteName || base.siteName).slice(0, 120),
    homeTitle: String(raw.homeTitle || base.homeTitle).slice(0, 200),
    homeIntro: String(raw.homeIntro || base.homeIntro).slice(0, 2000),
    homeNotice: String(raw.homeNotice || base.homeNotice).slice(0, 1000),
    navHome: String(raw.navHome || base.navHome).slice(0, 40),
    navNews: String(raw.navNews || base.navNews).slice(0, 40),
    navWechat: String(raw.navWechat || base.navWechat).slice(0, 40),
    navContact: String(raw.navContact || base.navContact).slice(0, 40),
    navSearch: String(raw.navSearch || base.navSearch).slice(0, 40),
    showCities: raw.showCities !== false,
    showNewsBlock: raw.showNewsBlock !== false,
    showWechatBlock: raw.showWechatBlock !== false,
    contactPhone: String(lead.contactPhone || env.CONTACT_PHONE || base.contactPhone).slice(0, 40),
  };
}

function richText(value: unknown): string {
  if (typeof value === 'string') return esc(value).replaceAll(/\r?\n/g, '<br>');
  if (!value || typeof value !== 'object') return '';
  const node = value as Record<string, unknown>;
  if (typeof node.text === 'string') return esc(node.text);
  if (Array.isArray(node.children)) return node.children.map(richText).join('');
  return '';
}

async function loadCityDocument(db: D1Database, cityName: string) {
  const parse = (row: { title?: string; data?: string } | null) => {
    if (!row?.data) return null;
    try {
      const data = JSON.parse(row.data) as Record<string, unknown>;
      return {
        title: String(data.title || row.title || ''),
        metaDescription: String(data.metaDescription || ''),
        contentHtml: richText(data.content),
        province: String(data.province || ''),
        city: String(data.city || ''),
      };
    } catch {
      return null;
    }
  };
  try {
    let row = await db
      .prepare(
        `SELECT title, data FROM documents WHERE tenant_id='default' AND type_id='seo_city_page' AND is_published=1 AND deleted_at IS NULL AND (json_extract(data,'$.city')=? OR title LIKE ?) ORDER BY updated_at DESC LIMIT 1`,
      )
      .bind(cityName, `%${cityName}%`)
      .first<{ title?: string; data?: string }>();
    let p = parse(row);
    if (p) return p;
    row = await db
      .prepare(
        `SELECT d.title, d.data FROM documents d JOIN document_types t ON t.id=d.type_id WHERE d.tenant_id='default' AND t.name='seo_city_page' AND d.is_published=1 AND d.deleted_at IS NULL AND (json_extract(d.data,'$.city')=? OR d.title LIKE ?) ORDER BY d.updated_at DESC LIMIT 1`,
      )
      .bind(cityName, `%${cityName}%`)
      .first<{ title?: string; data?: string }>();
    return parse(row);
  } catch {
    return null;
  }
}

const SITE_CSS = `${CONTACT_BAR_CSS}
:root{--brand:#2563eb;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f1f5f9}*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}a{color:inherit;text-decoration:none}.wrap{max-width:1120px;margin:0 auto;padding:0 20px}.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.header-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;flex-wrap:wrap}.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--brand)}.brand-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;display:grid;place-items:center}.brand small{display:block;font-weight:500;color:var(--muted);font-size:11px}.nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;font-weight:600;color:#334155}.phone{color:var(--brand);font-weight:800;font-size:14px}.hero{border-radius:24px;overflow:hidden;margin:20px 0 28px;min-height:300px;background:linear-gradient(135deg,#0b3b82,#1d4ed8,#38bdf8);color:#fff}.hero-inner{padding:48px 40px;max-width:720px}.hero h1{margin:0 0 10px;font-size:clamp(26px,5vw,40px);font-weight:800}.hero-sub{margin:0 0 10px;opacity:.95}.hero-intro{margin:0 0 18px;opacity:.9;font-size:14px}.hero-search{display:flex;background:#fff;border-radius:14px;overflow:hidden;max-width:560px}.hero-search select,.hero-search input{border:0;padding:14px;font-size:14px;outline:none;color:var(--ink)}.hero-search select{max-width:110px;background:#f8fafc;border-right:1px solid var(--line)}.hero-search input{flex:1}.hero-search button{border:0;background:#f59e0b;color:#111;font-weight:800;padding:0 22px;cursor:pointer}.svc-row{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:-36px 0 28px;position:relative;z-index:2}.svc-item{background:#fff;border-radius:16px;padding:16px 10px;text-align:center;border:1px solid var(--line);box-shadow:0 8px 24px rgba(15,23,42,.06)}.svc-ico{font-size:22px;margin-bottom:6px}.svc-item strong{display:block;font-size:14px}.svc-item span{font-size:12px;color:var(--muted)}.section{background:#fff;border-radius:20px;padding:28px;margin-bottom:22px;border:1px solid var(--line)}.section-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:16px}.section-head h2{margin:0;font-size:22px}.section-head a{font-size:13px;color:var(--brand);font-weight:700}.hot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.hot-card{border:1px solid var(--line);border-radius:14px;overflow:hidden}.hot-card .pic{height:100px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:grid;place-items:center;font-size:28px}.hot-card .body{padding:14px}.hot-card h3{margin:0 0 6px;font-size:15px}.hot-card p{margin:0 0 8px;font-size:12px;color:var(--muted)}.city-chips{display:flex;flex-wrap:wrap;gap:10px}.city-chips a{padding:8px 14px;border-radius:999px;background:#f8fafc;border:1px solid var(--line);font-size:13px;font-weight:600}.btn{display:inline-block;background:var(--brand);color:#fff!important;padding:10px 18px;border-radius:10px;font-weight:700;border:0;cursor:pointer}.btn-amber{background:#f59e0b;color:#111!important}.advisor{display:flex;justify-content:space-between;gap:16px;padding:22px;border-radius:18px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;margin-bottom:22px;align-items:center}.footer{padding:28px 0 40px;color:var(--muted);font-size:13px;text-align:center}.mobile-tab{display:none}.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:14px}.muted{color:var(--muted);font-size:13px}.form{display:grid;gap:12px;max-width:520px}.form input,.form textarea{padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit}@media(max-width:900px){.svc-row{grid-template-columns:repeat(3,1fr)}.hot-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.nav{display:none}.svc-row{grid-template-columns:repeat(3,1fr)}.hot-grid{grid-template-columns:1fr}.advisor{flex-direction:column;align-items:flex-start}.mobile-tab{display:flex;position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:8px 0;justify-content:space-around;z-index:60}.mobile-tab a{display:flex;flex-direction:column;align-items:center;font-size:11px;color:#64748b;font-weight:600}.mobile-tab a.active{color:var(--brand)}body{padding-bottom:64px}}`;

async function page(
  title: string,
  description: string,
  body: string,
  env: SeoEnv,
  request: Request,
  lang: LanguageCode,
  home: HomeSettings,
  canonical?: string,
  activeNav?: string,
) {
  const m = t(lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  const phone = home.contactPhone || m.phoneDisplay;
  const canonicalTag = canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '';
  const htmlLang = lang === 'zh' ? 'zh-CN' : lang;
  return new Response(
    `<!doctype html><html lang="${htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonicalTag}<meta name="robots" content="index,follow"><style>${SITE_CSS}</style></head><body>
<header class="site-header"><div class="wrap header-inner">
  <a class="brand" href="/${q}"><span class="brand-mark">税</span><span>${esc(home.siteName)}<small>${esc(m.siteTagline)}</small></span></a>
  <nav class="nav">
    <a href="/${q}">${esc(home.navHome || m.navHome)}</a>
    <a href="/#services">${esc(m.navServices)}</a>
    <a href="/#cities">${esc(m.navCities)}</a>
    <a href="/news${q}">${esc(home.navNews || m.navNews)}</a>
    <a href="/contact${q}">${esc(home.navContact || m.navContact)}</a>
  </nav>
  <div class="header-actions"><a class="phone" href="tel:${esc(phone.replace(/\s/g, ''))}">☎ ${esc(phone)}</a></div>
</div></header>
<main class="wrap">${body}</main>
<footer class="footer"><div class="wrap">${esc(m.footer)}</div></footer>
${contactBarHtml(await loadContacts(env.DB), m.phoneDisplay)}
<nav class="mobile-tab">
  <a class="${activeNav === 'home' ? 'active' : ''}" href="/${q}"><span>🏠</span>${esc(home.navHome || m.navHome)}</a>
  <a href="/#services"><span>📋</span>${esc(m.navServices)}</a>
  <a class="${activeNav === 'news' ? 'active' : ''}" href="/news${q}"><span>📰</span>${esc(home.navNews || m.navNews)}</a>
  <a class="${activeNav === 'contact' ? 'active' : ''}" href="/contact${q}"><span>☎</span>${esc(home.navContact || m.navContact)}</a>
</nav></body></html>`,
    { headers: { 'content-type': 'text/html; charset=UTF-8', 'set-cookie': languageCookieHeader(lang) } },
  );
}

const cityUrl = (request: Request, name: string) =>
  `${new URL(request.url).origin}/city/${encodeURIComponent(name)}`;

adminSettingsRoutes.get('/api/seo', async (c) => {
  const s = await getStoredSettings(c.env.DB, 'seo');
  return c.json({
    success: true,
    data: {
      seoTitle: s.seoTitle || '专业财税服务',
      seoKeywords: s.seoKeywords || '',
      seoDescription: s.seoDescription || '',
      canonicalUrl: s.canonicalUrl || '',
      robots: s.robots || 'index,follow',
      indexNowEnabled: s.indexNowEnabled !== false,
    },
  });
});
adminSettingsRoutes.post('/api/seo', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ok = await saveStoredSettings(c.env.DB, 'seo', {
    seoTitle: String(body.seoTitle || '').slice(0, 180),
    seoKeywords: String(body.seoKeywords || '').slice(0, 500),
    seoDescription: String(body.seoDescription || '').slice(0, 500),
    canonicalUrl: String(body.canonicalUrl || '').slice(0, 300),
    robots: String(body.robots || 'index,follow').slice(0, 100),
    indexNowEnabled: body.indexNowEnabled !== false,
  });
  return c.json(ok ? { success: true, message: '已保存' } : { success: false, error: '失败' }, ok ? 200 : 500);
});
adminSettingsRoutes.get('/api/lead', async (c) => {
  const s = await getStoredSettings(c.env.DB, 'lead');
  return c.json({
    success: true,
    data: {
      contactPhone: s.contactPhone || '',
      wechat: s.wechat || '',
      qq: s.qq || '',
      telegram: s.telegram || '',
      whatsapp: s.whatsapp || '',
      leadEnabled: s.leadEnabled !== false,
      leadMessage: s.leadMessage || '请通过正规渠道提交真实业务需求。',
    },
  });
});
adminSettingsRoutes.post('/api/lead', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ok = await saveStoredSettings(c.env.DB, 'lead', {
    contactPhone: String(body.contactPhone || '').slice(0, 80),
    wechat: String(body.wechat || '').slice(0, 120),
    qq: String(body.qq || '').slice(0, 40),
    telegram: String(body.telegram || '').slice(0, 120),
    whatsapp: String(body.whatsapp || '').slice(0, 40),
    leadEnabled: body.leadEnabled !== false,
    leadMessage: String(body.leadMessage || '').slice(0, 500),
  });
  return c.json(ok ? { success: true, message: '获客设置已保存' } : { success: false, error: '失败' }, ok ? 200 : 500);
});
adminSettingsRoutes.get('/api/home', async (c) => {
  const data = await loadHomeSettings({ DB: c.env.DB, SITE_NAME: c.env.SITE_NAME }, detectLanguage(c.req.raw));
  return c.json({ success: true, data });
});
adminSettingsRoutes.post('/api/home', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ok = await saveStoredSettings(c.env.DB, 'home', {
    siteName: String(body.siteName || '').slice(0, 120),
    homeTitle: String(body.homeTitle || '').slice(0, 200),
    homeIntro: String(body.homeIntro || '').slice(0, 2000),
    homeNotice: String(body.homeNotice || '').slice(0, 1000),
    navHome: String(body.navHome || '').slice(0, 40),
    navNews: String(body.navNews || '').slice(0, 40),
    navWechat: String(body.navWechat || '').slice(0, 40),
    navContact: String(body.navContact || '').slice(0, 40),
    navSearch: String(body.navSearch || '').slice(0, 40),
    showCities: body.showCities !== false,
    showNewsBlock: body.showNewsBlock !== false,
    showWechatBlock: body.showWechatBlock !== false,
  });
  return c.json(ok ? { success: true, message: '首页设置已保存' } : { success: false, error: '失败' }, ok ? 200 : 500);
});

async function home(request: Request, env: SeoEnv, lang: LanguageCode) {
  const origin = new URL(request.url).origin;
  const m = t(lang);
  const homeCfg = await loadHomeSettings(env, lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  const showAll = new URL(request.url).searchParams.get('cities') === 'all';
  const featured = showAll
    ? SEO_CITIES.map((c) => c.name)
    : ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '南京', '苏州', '天津'];
  const cityChips = featured.map((n) => `<a href="${cityUrl(request, n)}">${esc(n)}</a>`).join('');
  const services = [
    { icon: '📒', title: '代理记账', desc: '专业团队' },
    { icon: '🧾', title: '发票服务', desc: '电子发票' },
    { icon: '📑', title: '税务申报', desc: '按时申报' },
    { icon: '💬', title: '财税咨询', desc: '一对一' },
    { icon: '🏢', title: '工商服务', desc: '注册变更' },
  ];
  const svcRow = services
    .map(
      (s) =>
        `<a class="svc-item" href="/contact${q}" id="services"><div class="svc-ico">${s.icon}</div><strong>${esc(s.title)}</strong><span>${esc(s.desc)}</span></a>`,
    )
    .join('');
  const hot = [
    { icon: '📊', title: '代理记账', desc: '专业会计' },
    { icon: '⚡', title: '发票代开', desc: '快速办理' },
    { icon: '📅', title: '税务申报', desc: '规避风险' },
    { icon: '🤝', title: '财税咨询', desc: '量身定制' },
  ];
  const hotCards = hot
    .map(
      (h) =>
        `<article class="hot-card"><div class="pic">${h.icon}</div><div class="body"><h3>${esc(h.title)}</h3><p>${esc(h.desc)}</p><a href="/contact${q}">${esc(m.newsReadMore)}</a></div></article>`,
    )
    .join('');
  const citiesBlock = homeCfg.showCities
    ? `<section class="section" id="cities"><div class="section-head"><h2>${esc(m.homeCitiesTitle)}</h2><a href="${showAll ? '/#cities' : '/?cities=all#cities'}">${showAll ? '收起' : '查看更多 →'}</a></div><div class="city-chips">${cityChips}</div></section>`
    : '';
  const newsBlock = homeCfg.showNewsBlock
    ? `<section class="section"><div class="section-head"><h2>${esc(m.homeNewsTitle)}</h2><a href="/news${q}">${esc(m.homeNewsBtn)}</a></div><p class="muted">${esc(m.homeNewsBody)}</p></section>`
    : '';
  const wechatBlock = homeCfg.showWechatBlock
    ? `<section class="section"><div class="section-head"><h2>${esc(m.homeWechatTitle)}</h2><a href="/wechat${q}">${esc(m.homeWechatBtn)}</a></div><p class="muted">${esc(m.homeWechatBody)}</p></section>`
    : '';
  const body = `<section class="hero"><div class="hero-inner"><h1>${esc(homeCfg.homeTitle || m.homeHeroTitle)}</h1><p class="hero-sub">${esc(m.homeHeroSub)}</p><p class="hero-intro">${esc(homeCfg.homeIntro || m.homeHeroBody)}</p><form class="hero-search" action="/search" method="get"><select name="city"><option value="">城市</option>${featured
    .slice(0, 10)
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join('')}</select><input name="q" placeholder="${esc(m.homeSearchPlaceholder)}"/><button type="submit">${esc(m.homeSearchBtn)}</button></form></div></section><div class="svc-row">${svcRow}</div><section class="section"><div class="section-head"><h2>${esc(m.homeHotServices)}</h2><a href="/contact${q}">更多 →</a></div><div class="hot-grid">${hotCards}</div></section>${citiesBlock}${newsBlock}${wechatBlock}<div class="advisor"><div><h3>${esc(m.homeAdvisorTitle)}</h3><p>${esc(homeCfg.homeNotice || m.homeNotice)}</p></div><a class="btn btn-amber" href="/contact${q}">${esc(m.homeAdvisorBtn)}</a></div>`;
  return await page(m.homeTitle, m.homeDesc, body, env, request, lang, homeCfg, origin + '/', 'home');
}

async function contactPage(request: Request, env: SeoEnv, lang: LanguageCode) {
  const m = t(lang);
  const homeCfg = await loadHomeSettings(env, lang);
  const body = `<section class="section"><h1>${esc(m.contactTitle)}</h1><p class="muted">${esc(m.contactDesc)}</p><form class="form" method="post" action="/api/lead"><input name="name" placeholder="${esc(m.contactName)}" required><input name="phone" placeholder="${esc(m.contactPhone)}" required><input name="city" placeholder="${esc(m.contactCity)}"><textarea name="need" rows="4" placeholder="${esc(m.contactNeed)}" required></textarea><button class="btn" type="submit">${esc(m.contactSubmit)}</button></form></section>`;
  return await page(m.contactTitle, m.contactDesc, body, env, request, lang, homeCfg, undefined, 'contact');
}

async function saveLead(request: Request, env: SeoEnv) {
  try {
    const limited = await assertLeadRateLimit(request, env.CACHE_KV);
    if (!limited.ok) return limited.response;
    const form = await request.formData();
    if (env.DB) {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS seo_leads (id TEXT PRIMARY KEY, name TEXT, phone TEXT, city TEXT, need TEXT, created_at INTEGER)`,
      )
        .run()
        .catch(() => {});
      await env.DB.prepare(
        `INSERT INTO seo_leads (id, name, phone, city, need, created_at) VALUES (?,?,?,?,?,?)`,
      )
        .bind(
          crypto.randomUUID(),
          String(form.get('name') || '').slice(0, 80),
          String(form.get('phone') || '').slice(0, 40),
          String(form.get('city') || '').slice(0, 40),
          String(form.get('need') || '').slice(0, 1000),
          now,
        )
        .run()
        .catch(() => {});
    }
    return Response.redirect(new URL('/contact?ok=1', request.url).toString(), 303);
  } catch {
    return new Response('error', { status: 500 });
  }
}

async function cityPage(request: Request, env: SeoEnv, city: string, lang: LanguageCode) {
  const m = t(lang);
  const homeCfg = await loadHomeSettings(env, lang);
  const doc = env.DB ? await loadCityDocument(env.DB, city) : null;
  const title = doc?.title || `${city}财税与发票服务`;
  const content = doc?.contentHtml
    ? `<div class="card">${doc.contentHtml}</div>`
    : `<div class="card"><p>${city}提供代理记账、代开发票、税务申报、财税咨询等服务信息。</p><p class="muted">${esc(homeCfg.homeNotice || m.homeNotice)}</p></div>`;
  return await page(
    title,
    doc?.metaDescription || m.homeDesc,
    `<section class="section"><h1>${esc(title)}</h1>${content}<p style="margin-top:16px"><a class="btn" href="/contact">${esc(m.homeContactBtn)}</a></p></section>`,
    env,
    request,
    lang,
    homeCfg,
    cityUrl(request, city),
  );
}

export async function handleSeoRequest(request: Request, env: SeoEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const lang = detectLanguage(request);
  if (request.method === 'GET' && url.pathname === '/robots.txt') {
    return new Response(
      `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: ${url.origin}/sitemap.xml
`,
      { headers: { 'content-type': 'text/plain; charset=UTF-8' } },
    );
  }
  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    const urls = [
      `${url.origin}/`,
      `${url.origin}/news`,
      `${url.origin}/wechat`,
      `${url.origin}/contact`,
      ...SEO_CITIES.map((c) => cityUrl(request, c.name)),
    ];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
        .map((u) => `<url><loc>${esc(u)}</loc></url>`)
        .join('')}</urlset>`,
      { headers: { 'content-type': 'application/xml; charset=UTF-8' } },
    );
  }
  if (request.method === 'GET' && env.INDEXNOW_KEY && url.pathname === `/${env.INDEXNOW_KEY}.txt`) {
    return new Response(env.INDEXNOW_KEY, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
  }
  if (request.method === 'GET' && url.pathname === '/') return home(request, env, lang);
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
        urlList: [`${origin}/`, `${origin}/sitemap.xml`],
      }),
    });
  } catch (e) {
    console.warn('[indexnow]', e);
  }
}
