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

const siteName = (env: SeoEnv, lang: LanguageCode, override?: string) =>
  override || env.SITE_NAME || t(lang).siteName;

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
  };
}

async function getStoredSettings(db: D1Database, category: string): Promise<Record<string, any>> {
  try {
    const row = await db.prepare(
      `SELECT data FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
    ).bind(SETTINGS_TYPE, category, SETTINGS_TENANT).first() as { data?: string } | null;
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
    await db.prepare(
      `INSERT OR IGNORE INTO document_types (id, name, display_name, description, schema, source, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(SETTINGS_TYPE, SETTINGS_TYPE, 'Site Settings', 'Global site configuration settings', '{}', 'system', 1, 1, now, now).run();
    const row = await db.prepare(
      `SELECT id FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
    ).bind(SETTINGS_TYPE, category, SETTINGS_TENANT).first() as { id?: string } | null;
    if (row?.id) {
      await db.prepare(`UPDATE documents SET data = ?, updated_at = ? WHERE id = ? AND is_current_draft = 1`).bind(jsonData, now, row.id).run();
    } else {
      const id = crypto.randomUUID();
      const title = category === 'home' ? 'Homepage Settings' : category === 'seo' ? 'SEO Settings' : 'Lead Settings';
      await db.prepare(
        `INSERT INTO documents (id, root_id, type_id, version_number, is_current_draft, is_published, status, parent_root_id, slug, title, tenant_id, locale, translation_group_id, data, metadata, created_at, updated_at) VALUES (?, ?, ?, 1, 1, 1, 'published', '', ?, ?, ?, 'default', '', ?, '{}', ?, ?)`,
      ).bind(id, id, SETTINGS_TYPE, category, title, SETTINGS_TENANT, jsonData, now, now).run();
    }
    return true;
  } catch (error) {
    console.error(`[tax-seo-settings] save ${category} failed`, error);
    return false;
  }
}

async function loadHomeSettings(env: SeoEnv, lang: LanguageCode): Promise<HomeSettings> {
  const base = defaultHomeSettings(lang, env);
  if (!env.DB) return base;
  const raw = await getStoredSettings(env.DB, 'home').catch(() => ({}));
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

async function loadCityDocument(db: D1Database, cityName: string): Promise<{
  title?: string;
  metaDescription?: string;
  contentHtml?: string;
  province?: string;
} | null> {
  try {
    const row = await db.prepare(`
      SELECT title, data FROM documents
      WHERE tenant_id = 'default' AND type_id = 'seo_city_page'
        AND is_published = 1 AND deleted_at IS NULL
        AND (json_extract(data, '$.city') = ? OR title LIKE ?)
      ORDER BY updated_at DESC LIMIT 1
    `).bind(cityName, `%${cityName}%`).first<{ title?: string; data?: string }>();
    if (!row?.data) return null;
    const data = JSON.parse(row.data) as Record<string, unknown>;
    return {
      title: String(data.title || row.title || ''),
      metaDescription: String(data.metaDescription || ''),
      contentHtml: richText(data.content),
      province: String(data.province || ''),
    };
  } catch {
    // Fallback without json_extract
    try {
      const rows = await db.prepare(`
        SELECT title, data FROM documents
        WHERE tenant_id = 'default' AND type_id = 'seo_city_page'
          AND is_published = 1 AND deleted_at IS NULL
        ORDER BY updated_at DESC LIMIT 200
      `).all<{ title?: string; data?: string }>();
      for (const row of rows.results || []) {
        try {
          const data = JSON.parse(row.data || '{}') as Record<string, unknown>;
          if (String(data.city || '') === cityName) {
            return {
              title: String(data.title || row.title || ''),
              metaDescription: String(data.metaDescription || ''),
              contentHtml: richText(data.content),
              province: String(data.province || ''),
            };
          }
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
    return null;
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
  return `<div class="lang">${t(lang).language}: ${options}</div>`;
}

function mainNav(lang: LanguageCode, home: HomeSettings): string {
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  return `<nav class="nav">
    <a href="/${q}">${esc(home.navHome)}</a>
    <a href="/news${q}">${esc(home.navNews)}</a>
    <a href="/wechat${q}">${esc(home.navWechat)}</a>
    <a href="/contact${q}">${esc(home.navContact)}</a>
  </nav>`;
}

const page = (
  title: string,
  description: string,
  body: string,
  env: SeoEnv,
  request: Request,
  lang: LanguageCode,
  home: HomeSettings,
  canonical?: string,
) => {
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
.hero{background:#fff;border-radius:18px;padding:30px;box-shadow:0 8px 30px #10204012;margin-bottom:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.city{display:flex;flex-direction:column;gap:3px;background:#fff;padding:14px;border-radius:12px;text-decoration:none;color:#0b3b82;border:1px solid #e7ebf2;transition:.15s}.city:hover{transform:translateY(-2px);box-shadow:0 8px 20px #10204014}.city span{font-size:12px;color:#667085}
.btn{display:inline-block;background:#0b3b82;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;border:0;font-weight:700;cursor:pointer}.btn-light{background:#fff;color:#0b3b82;border:1px solid #dce5f3}
.muted{color:#667085}.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:14px 16px;border-radius:8px}
.home-hero{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,.7fr);gap:24px;padding:42px 34px;border-radius:22px;background:linear-gradient(135deg,#0b3b82,#1765bd);color:#fff;box-shadow:0 18px 50px #0b3b8228;margin-bottom:28px}.hero-copy h1{font-size:clamp(34px,5vw,54px);margin:10px 0 14px}.hero-desc{font-size:18px;max-width:760px;color:#e9f2ff}.eyebrow{display:inline-block;font-size:12px;letter-spacing:1.5px;font-weight:800;color:#5b8fd4}.home-hero .eyebrow{color:#bcd8ff}.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}.home-search{display:flex;max-width:720px;margin-top:18px}.home-search input{flex:1;min-width:0;padding:14px 16px;border:0;border-radius:10px 0 0 10px;font-size:15px}.home-search button{padding:0 22px;border:0;border-radius:0 10px 10px 0;background:#f0b429;color:#172033;font-weight:800}.hero-card{background:#fff;color:#172033;border-radius:18px;padding:24px;align-self:stretch;display:flex;flex-direction:column;justify-content:center}.hero-card-title{font-size:13px;font-weight:800;color:#667085}.tag-list{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}.tag-list span{background:#eef5ff;color:#0b3b82;padding:7px 10px;border-radius:999px;font-size:13px;font-weight:700}.hero-card-note{font-size:13px;color:#667085;border-top:1px solid #e7ebf2;padding-top:14px}.home-section{margin:28px 0;padding:32px;background:#fff;border-radius:20px;box-shadow:0 8px 28px #1020400c}.section-head{display:flex;justify-content:space-between;gap:25px;align-items:end;margin-bottom:22px}.section-head h2{font-size:30px;margin:6px 0 0}.section-head>p{max-width:520px;color:#667085;margin:0}.service-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.service-card{padding:20px;border:1px solid #e7ebf2;border-radius:15px;background:#fbfcfe}.service-icon{width:30px;height:30px;border-radius:50%;background:#eaf3ff;color:#0b3b82;display:grid;place-items:center;font-weight:900}.service-card h3{margin:14px 0 7px}.service-card p{margin:0;color:#667085;font-size:14px}.city-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.split-section{display:grid;grid-template-columns:1.3fr .7fr;gap:30px;align-items:center}.info-panel{background:#f5f8fd;padding:22px;border-radius:15px}.info-panel p{font-weight:800;color:#0b3b82}.info-panel small{color:#667085}.light-section{background:#f1f6fc}.trust-section{display:flex;justify-content:space-between;gap:25px;align-items:center;background:#fff8e6;border:1px solid #f2dfaa}.trust-section h2{margin:5px 0}.footer{margin-top:40px;padding:25px 0;color:#667085;font-size:14px}
@media(max-width:800px){.home-hero{grid-template-columns:1fr;padding:28px 22px}.service-grid,.city-grid{grid-template-columns:repeat(2,1fr)}.section-head,.split-section,.trust-section{display:block}.section-head>p{margin-top:10px}.trust-section .btn{margin-top:16px}.hero-card{min-height:180px}}
@media(max-width:520px){.service-grid,.city-grid{grid-template-columns:1fr}.home-search input{font-size:14px}.home-search button{padding:0 15px}.hero-copy h1{font-size:34px}}
.form{display:grid;gap:12px;max-width:620px}.form input,.form textarea{padding:12px;border:1px solid #d7dce5;border-radius:8px;font-size:16px}
.footer{margin-top:40px;padding:25px 0;color:#667085;font-size:14px}
.prose p{margin:0.6em 0}
</style></head><body>
<header><div class="top"><strong>${esc(home.siteName)}</strong>${langSwitcher(request, lang)}</div>${mainNav(lang, home)}</header>
<main>${body}
<div class="footer">${esc(m.footer)}</div></main></body></html>`, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'set-cookie': languageCookieHeader(lang),
    },
  });
};

const cityUrl = (request: Request, name: string) => `${new URL(request.url).origin}/city/${encodeURIComponent(name)}`;

// Admin settings APIs (SonicJS settings area can call these)
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

adminSettingsRoutes.get('/api/home', async (c) => {
  const lang = detectLanguage(c.req.raw);
  const data = await loadHomeSettings({ DB: c.env.DB, SITE_NAME: c.env.SITE_NAME }, lang);
  return c.json({ success: true, data });
});

adminSettingsRoutes.post('/api/home', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const data = {
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
  };
  const ok = await saveStoredSettings(c.env.DB, 'home', data);
  return c.json(ok ? { success: true, message: '首页设置已保存' } : { success: false, error: '首页设置保存失败' }, ok ? 200 : 500);
});

async function home(request: Request, env: SeoEnv, lang: LanguageCode) {
  const origin = new URL(request.url).origin;
  const m = t(lang);
  const homeCfg = await loadHomeSettings(env, lang);
  const q = lang === 'zh' ? '' : `?lang=${lang}`;
  const cityLinks = SEO_CITIES.map((city) =>
    `<a class="city" href="${cityUrl(request, city.name)}"><strong>${esc(city.name)}</strong><span>${lang === 'zh' ? '开票 · 发票 · 税务 · 财税' : 'Invoice · Tax · Finance'}</span></a>`
  ).join('');

  const serviceItems = lang === 'zh'
    ? [
        ['增值税发票咨询', '发票类型、开具流程、材料与合规注意事项'],
        ['企业税务咨询', '增值税、企业所得税及日常税务流程咨询'],
        ['财税流程咨询', '企业经营中的记账、申报、发票与税务流程'],
        ['城市开票服务', '按城市进入独立页面，查看当地服务与办理信息'],
      ]
    : [
        ['Invoice consulting', 'Invoice types, process, documents and compliance guidance'],
        ['Tax consulting', 'VAT, corporate tax and routine tax process guidance'],
        ['Finance process', 'Bookkeeping, filing, invoicing and finance workflow guidance'],
        ['City service portals', 'Dedicated city pages with local service information'],
      ];

  const services = serviceItems.map(([title, body]) =>
    `<article class="service-card"><div class="service-icon">✓</div><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`
  ).join('');

  const citiesBlock = homeCfg.showCities
    ? `<section class="home-section"><div class="section-head"><div><span class="eyebrow">${lang === 'zh' ? '全国覆盖' : 'NATIONWIDE'}</span><h2>${esc(m.homeCitiesTitle)}</h2></div><p>${lang === 'zh' ? '从城市入口进入对应页面，覆盖“城市 + 开票 / 发票 / 税务 / 财税”等搜索需求。' : 'Enter a city portal for local invoice and tax information.'}</p></div><div class="city-grid">${cityLinks}</div></section>`
    : '';

  const newsBlock = homeCfg.showNewsBlock
    ? `<section class="home-section split-section"><div><span class="eyebrow">${lang === 'zh' ? '政策资讯' : 'INSIGHTS'}</span><h2>${esc(m.homeNewsTitle)}</h2><p>${esc(m.homeNewsBody)}</p><a class="btn" href="${origin}/news${q}">${esc(m.homeNewsBtn)}</a></div><div class="info-panel"><b>${lang === 'zh' ? '内容标准' : 'CONTENT STANDARD'}</b><p>${lang === 'zh' ? '来源 + 原创解读 + 企业实际价值' : 'Source + original interpretation + business value'}</p><small>${esc(m.policyNotice)}</small></div></section>`
    : '';

  const wechatBlock = homeCfg.showWechatBlock
    ? `<section class="home-section split-section light-section"><div><span class="eyebrow">WECHAT</span><h2>${esc(m.homeWechatTitle)}</h2><p>${esc(m.homeWechatBody)}</p></div><div><a class="btn" href="${origin}/wechat${q}">${esc(m.homeWechatBtn)}</a></div></section>`
    : '';

  const searchBox = `<form class="home-search" action="/search" method="get"><input name="q" aria-label="${esc(m.navSearch)}" placeholder="${lang === 'zh' ? '搜索城市、发票、税务、财税关键词' : 'Search city, invoice or tax keywords'}"><button type="submit">${lang === 'zh' ? '搜索' : 'Search'}</button></form>`;

  const body = `
<section class="home-hero">
  <div class="hero-copy">
    <span class="eyebrow">${lang === 'zh' ? '全国企业与个人财税服务信息平台' : 'NATIONWIDE TAX & INVOICE INFORMATION'}</span>
    <h1>${esc(homeCfg.homeTitle)}</h1>
    <p class="hero-desc">${esc(homeCfg.homeIntro)}</p>
    <div class="hero-actions"><a class="btn" href="${origin}/contact${q}">${esc(m.homeContactBtn)}</a><a class="btn btn-light" href="#cities">${lang === 'zh' ? '选择城市' : 'Choose a city'}</a></div>
    ${searchBox}
  </div>
  <div class="hero-card">
    <div class="hero-card-title">${lang === 'zh' ? '您可以查询' : 'YOU CAN FIND'}</div>
    <div class="tag-list"><span>发票</span><span>增值税</span><span>税务</span><span>财税</span><span>开票</span><span>城市服务</span></div>
    <div class="hero-card-note">${esc(homeCfg.homeNotice)}</div>
  </div>
</section>

<section class="home-section services-section">
  <div class="section-head"><div><span class="eyebrow">${lang === 'zh' ? '服务内容' : 'SERVICES'}</span><h2>${lang === 'zh' ? '发票与财税服务信息' : 'Invoice & Tax Information'}</h2></div><p>${lang === 'zh' ? '围绕真实业务场景提供流程、材料、政策和合规信息。' : 'Clear process, document, policy and compliance information.'}</p></div>
  <div class="service-grid">${services}</div>
</section>

<div id="cities">${citiesBlock}</div>
${newsBlock}
${wechatBlock}

<section class="home-section trust-section">
  <div><span class="eyebrow">${lang === 'zh' ? '合规说明' : 'COMPLIANCE'}</span><h2>${lang === 'zh' ? '真实交易，依法依规' : 'Real transactions. Lawful service.'}</h2><p>${esc(homeCfg.homeNotice)}</p></div>
  <a class="btn" href="${origin}/contact${q}">${esc(m.homeContactBtn)}</a>
</section>`;

  return page(
    `${homeCfg.siteName}｜${homeCfg.homeTitle}`,
    homeCfg.homeIntro.slice(0, 180),
    body,
    env,
    request,
    lang,
    homeCfg,
    origin,
  );
}

async function cityPage(request: Request, env: SeoEnv, cityName: string, lang: LanguageCode) {
  const match = SEO_CITIES.find((item) => item.name === cityName);
  const homeCfg = await loadHomeSettings(env, lang);
  const m = t(lang);
  const doc = env.DB ? await loadCityDocument(env.DB, cityName) : null;
  const province = doc?.province || match?.province || (lang === 'zh' ? '全国' : 'Nationwide');
  const title = doc?.title
    || (lang === 'zh'
      ? `${cityName}开票/发票/税务/财税咨询｜${homeCfg.siteName}`
      : `${cityName} invoice & tax consulting｜${homeCfg.siteName}`);
  const description = doc?.metaDescription
    || (lang === 'zh'
      ? `提供${cityName}及周边企业、个人的发票与税务流程咨询，说明常见材料、办理步骤和合规注意事项。`
      : `Invoice and tax process guidance for businesses and individuals in ${cityName}.`);
  const customBody = doc?.contentHtml
    ? `<div class="prose">${doc.contentHtml}</div>`
    : `<p>${lang === 'zh' ? '服务地区' : 'Region'}：${esc(province)} · ${esc(cityName)}</p><p class="notice">${esc(homeCfg.homeNotice)}</p><p class="muted">${lang === 'zh' ? '可在后台「SEO城市页面」发布自定义正文后覆盖本模板。' : 'Publish a city page in admin to override this template.'}</p>`;
  return page(
    title,
    description,
    `<section class="hero"><h1>${esc(cityName)}${lang === 'zh' ? '发票与财税服务' : ' Invoice & Tax Services'}</h1>${customBody}<p style="margin-top:16px"><a class="btn" href="/contact?city=${encodeURIComponent(cityName)}${lang !== 'zh' ? `&lang=${lang}` : ''}">${esc(m.homeContactBtn)}</a></p></section>
<section class="hero"><h2>${esc(m.homeCitiesTitle)}</h2><div class="grid">${SEO_CITIES.slice(0, 48).map((item) => `<a class="city" href="${cityUrl(request, item.name)}">${esc(item.name)}</a>`).join('')}</div></section>`,
    env,
    request,
    lang,
    homeCfg,
    cityUrl(request, cityName),
  );
}

async function contactPage(request: Request, env: SeoEnv, lang: LanguageCode) {
  const city = new URL(request.url).searchParams.get('city') || '';
  const m = t(lang);
  const homeCfg = await loadHomeSettings(env, lang);
  return page(`${m.contactTitle}｜${homeCfg.siteName}`, m.contactDesc,
    `<section class="hero"><h1>${esc(m.contactTitle)}</h1><p class="muted">${esc(m.contactDesc)}</p><form class="form" method="post" action="/api/lead"><input name="city" value="${esc(city)}" placeholder="${esc(m.contactCity)}"><input name="name" required placeholder="${esc(m.contactName)}"><input name="phone" required placeholder="${esc(m.contactPhone)}"><textarea name="need" required rows="6" placeholder="${esc(m.contactNeed)}"></textarea><input type="hidden" name="lang" value="${esc(lang)}"><button class="btn" type="submit">${esc(m.contactSubmit)}</button></form>${env.CONTACT_PHONE ? `<p>${esc(m.contactPhone)}：${esc(env.CONTACT_PHONE)}</p>` : ''}</section>`, env, request, lang, homeCfg);
}

async function newsPage(env: SeoEnv, request: Request, lang: LanguageCode) {
  const m = t(lang);
  const homeCfg = await loadHomeSettings(env, lang);
  const origin = new URL(request.url).origin;
  return page(`${m.newsTitle}｜${homeCfg.siteName}`, m.newsDesc,
    `<section class="hero"><h1>${esc(m.newsTitle)}</h1><p>${esc(m.newsDesc)}</p><p class="notice">${esc(m.policyNotice)}</p><a class="btn" href="${origin}/">${esc(m.backHome)}</a></section>`, env, request, lang, homeCfg);
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
  const homeCfg = await loadHomeSettings(env, lang);
  if (!name || !phone || !need) return new Response(lang === 'zh' ? '请完整填写咨询信息。' : 'Please fill in all fields.', { status: 400 });
  await env.DB.prepare("INSERT INTO seo_leads (city, name, phone, need, created_at) VALUES (?, ?, ?, ?, datetime('now'))").bind(city, name, phone, need).run();
  return page(m.contactSuccess, m.contactSuccess, `<section class="hero"><h1>${esc(m.contactSuccess)}</h1><p>${lang === 'zh' ? '我们已收到你的咨询需求。' : 'We have received your inquiry.'}</p><a class="btn" href="/">${esc(m.backHome)}</a></section>`, env, request, lang, homeCfg);
}

export async function handleSeoRequest(request: Request, env: SeoEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const lang = detectLanguage(request);

  if (request.method === 'GET' && url.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
  }
  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
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
