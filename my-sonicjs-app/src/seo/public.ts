import { SEO_CITIES } from './cities';

type SeoEnv = {
  DB?: D1Database;
  SITE_NAME?: string;
  CONTACT_PHONE?: string;
  INDEXNOW_KEY?: string;
};

const esc = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const siteName = (env: SeoEnv) => env.SITE_NAME || '全国财税发票服务';

const page = (title: string, description: string, body: string, env: SeoEnv, canonical?: string) => {
  const canonicalTag = canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '';
  return new Response(`<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonicalTag}
<meta name="robots" content="index,follow">
<style>
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#172033;background:#f6f8fb;line-height:1.75}
header{background:#0b3b82;color:#fff;padding:22px 5%}main{max-width:1180px;margin:auto;padding:28px 18px}h1,h2{line-height:1.35}.hero{background:#fff;border-radius:16px;padding:30px;box-shadow:0 6px 24px #10204012;margin-bottom:22px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.city{display:block;background:#fff;padding:12px;border-radius:10px;text-decoration:none;color:#0b3b82;border:1px solid #e7ebf2}.btn{display:inline-block;background:#0b3b82;color:#fff;padding:11px 18px;border-radius:9px;text-decoration:none;border:0}.muted{color:#667085}.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:14px 16px;border-radius:8px}.form{display:grid;gap:12px;max-width:620px}.form input,.form textarea{padding:12px;border:1px solid #d7dce5;border-radius:8px;font-size:16px}.footer{margin-top:40px;padding:25px 0;color:#667085;font-size:14px}
</style></head><body>
<header><strong>${esc(siteName(env))}</strong></header><main>${body}
<div class="footer">本网站仅提供依法依规的财税、发票及税务流程咨询服务，拒绝虚假发票、买卖发票及其他违法行为。</div></main></body></html>`, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
};

const cityUrl = (request: Request, name: string) => `${new URL(request.url).origin}/city/${encodeURIComponent(name)}`;

function home(request: Request, env: SeoEnv) {
  const origin = new URL(request.url).origin;
  const links = SEO_CITIES.map((city) => `<a class="city" href="${cityUrl(request, city.name)}">${esc(city.name)}发票/财税服务</a>`).join('');
  return page(
    `${siteName(env)}｜全国城市发票与财税服务`,
    '面向全国企业和个人提供依法依规的发票、税务、财税流程咨询服务，覆盖主要城市。',
    `<section class="hero"><h1>全国发票与财税服务</h1><p>围绕企业日常经营中的发票、税务申报、财税流程和合规咨询，提供清晰的办理路径与材料说明。</p><p class="notice">合规提示：仅接受真实交易和合法业务场景，不提供虚假交易、虚开发票、买卖发票等服务。</p><a class="btn" href="${origin}/contact">提交咨询</a></section>
<section class="hero"><h2>全国城市服务入口</h2><div class="grid">${links}</div></section>
<section class="hero"><h2>政策与实务解读</h2><p>内容栏目坚持“来源 + 原创解读 + 企业实际价值”，帮助企业理解政策变化与实际办理影响。</p><a class="btn" href="${origin}/news">查看财税政策解读</a></section>`,
    env,
    origin,
  );
}

function cityPage(request: Request, env: SeoEnv, cityName: string) {
  const match = SEO_CITIES.find((item) => item.name === cityName);
  const province = match?.province || '全国';
  const title = `${cityName}开票/发票/税务/财税咨询｜${siteName(env)}`;
  const description = `提供${cityName}及周边企业、个人的发票与税务流程咨询，说明常见材料、办理步骤和合规注意事项。`;
  return page(title, description,
    `<section class="hero"><h1>${esc(cityName)}发票与财税服务</h1><p>服务地区：${esc(province)} · ${esc(cityName)}</p><p>针对企业和个人常见的发票开具、税务事项、财税流程等需求，提供办理路径、材料清单和风险提示。</p><p class="notice">只处理真实、合法的业务。涉及发票的事项必须以真实交易和税法规定为基础。</p><h2>常见服务关键词</h2><p>${esc(cityName)}开票、${esc(cityName)}发票、${esc(cityName)}税务咨询、${esc(cityName)}代理记账咨询、${esc(cityName)}企业财税服务。</p><h2>办理前建议准备</h2><ul><li>真实交易背景及合同/订单等业务材料</li><li>主体基本信息及依法需要的税务资料</li><li>根据具体事项准备对应证明文件</li></ul><a class="btn" href="/contact?city=${encodeURIComponent(cityName)}">咨询${esc(cityName)}业务</a></section>
<section class="hero"><h2>全国其他城市</h2><div class="grid">${SEO_CITIES.slice(0, 48).map((item) => `<a class="city" href="${cityUrl(request, item.name)}">${esc(item.name)}</a>`).join('')}</div></section>`,
    env,
    cityUrl(request, cityName),
  );
}

function contactPage(request: Request, env: SeoEnv) {
  const city = new URL(request.url).searchParams.get('city') || '';
  return page(`提交财税咨询｜${siteName(env)}`, '提交企业或个人财税、发票、税务流程咨询需求。',
    `<section class="hero"><h1>提交咨询需求</h1><p class="muted">请填写真实需求，我们仅用于联系和业务咨询。</p><form class="form" method="post" action="/api/lead"><input name="city" value="${esc(city)}" placeholder="所在城市"><input name="name" required placeholder="称呼/企业名称"><input name="phone" required placeholder="联系电话"><textarea name="need" required rows="6" placeholder="请描述真实业务需求"></textarea><button class="btn" type="submit">提交咨询</button></form>${env.CONTACT_PHONE ? `<p>联系电话：${esc(env.CONTACT_PHONE)}</p>` : ''}</section>`, env);
}

function newsPage(env: SeoEnv, request: Request) {
  return page(`财税政策解读｜${siteName(env)}`, '财税政策与发票实务信息，采用来源、原创解读、企业实际价值的结构。',
    `<section class="hero"><h1>财税政策与发票实务解读</h1><p><strong>来源 + 原创解读 + 企业实际价值</strong></p><p>本站内容用于信息和流程参考。政策类内容应以税务机关、财政部门等权威来源的最新公告为准。</p><h2>内容原则</h2><ul><li>来源：标注公开、可核验的政策来源。</li><li>原创解读：用通俗语言解释政策对经营流程的影响。</li><li>企业实际价值：说明企业需要准备什么、注意什么、哪些场景不适用。</li></ul><p class="notice">不以采集、拼接或虚构政策信息制造低质量页面。</p><a class="btn" href="${new URL(request.url).origin}/">返回首页</a></section>`, env);
}

async function saveLead(request: Request, env: SeoEnv) {
  if (!env.DB) return new Response('Database binding DB is not configured.', { status: 503 });
  const form = await request.formData();
  const city = String(form.get('city') || '').slice(0, 80);
  const name = String(form.get('name') || '').slice(0, 120);
  const phone = String(form.get('phone') || '').slice(0, 80);
  const need = String(form.get('need') || '').slice(0, 4000);
  if (!name || !phone || !need) return new Response('请完整填写咨询信息。', { status: 400 });
  await env.DB.prepare('INSERT INTO seo_leads (city, name, phone, need, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').bind(city, name, phone, need).run();
  return page('提交成功', '咨询需求已提交。', `<section class="hero"><h1>提交成功</h1><p>我们已收到你的咨询需求。</p><a class="btn" href="/">返回首页</a></section>`, env);
}

export async function handleSeoRequest(request: Request, env: SeoEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
  }
  if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
    const urls = [`${url.origin}/`, `${url.origin}/news`, `${url.origin}/contact`, ...SEO_CITIES.map((city) => cityUrl(request, city.name))];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('')}</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
  }
  if (request.method === 'GET' && env.INDEXNOW_KEY && url.pathname === `/${env.INDEXNOW_KEY}.txt`) {
    return new Response(env.INDEXNOW_KEY, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
  }
  if (request.method === 'GET' && url.pathname === '/') return home(request, env);
  if (request.method === 'GET' && url.pathname === '/news') return newsPage(env, request);
  if (request.method === 'GET' && url.pathname === '/contact') return contactPage(request, env);
  if (request.method === 'POST' && url.pathname === '/api/lead') return saveLead(request, env);
  if (request.method === 'GET' && url.pathname.startsWith('/city/')) {
    const city = decodeURIComponent(url.pathname.slice('/city/'.length)).trim();
    if (city) return cityPage(request, env, city);
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
  } catch (error) {
    console.warn('[indexnow] ping failed', error);
  }
}
