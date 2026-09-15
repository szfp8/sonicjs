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
const sitePhone = (env: SeoEnv) => env.CONTACT_PHONE || '';

const page = (title: string, description: string, body: string, env: SeoEnv, canonical?: string) => {
  const canonicalTag = canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '';
  const phone = sitePhone(env);
  return new Response(`<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow">${canonicalTag}
<style>
:root{--brand:#155eef;--brand2:#0b3b82;--text:#172033;--muted:#667085;--bg:#f5f8fc;--line:#e5eaf2;--card:#fff;--ok:#067647}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--text);background:var(--bg);line-height:1.75}a{color:inherit}header{position:sticky;top:0;z-index:10;background:rgba(11,59,130,.97);color:#fff;box-shadow:0 2px 12px #0b3b8220}.nav{max-width:1180px;margin:auto;min-height:64px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{font-weight:800;font-size:18px;text-decoration:none}.navlinks{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.navlinks a{padding:8px 11px;text-decoration:none;border-radius:8px;font-size:14px}.navlinks a:hover{background:#ffffff18}.navbtn{background:#fff!important;color:var(--brand2);font-weight:700}.wrap{max-width:1180px;margin:auto;padding:0 18px}.hero{margin:28px 0;padding:48px 42px;border-radius:22px;background:linear-gradient(135deg,#eef5ff,#fff);border:1px solid #dce8fb;box-shadow:0 10px 35px #1020400d}.hero h1{font-size:clamp(30px,5vw,48px);line-height:1.2;margin:0 0 16px}.hero p{max-width:800px;color:var(--muted);font-size:17px}.badges{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}.badge{padding:6px 10px;border-radius:999px;background:#fff;border:1px solid #dce5f5;color:#34517c;font-size:13px}.btn{display:inline-block;background:var(--brand);color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;border:0;cursor:pointer}.btn.secondary{background:#fff;color:var(--brand2);border:1px solid #cddbf1}.section{margin:24px 0}.section h2{font-size:26px;margin:0 0 6px}.section-intro{color:var(--muted);margin-top:0}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 3px 15px #10204008}.card h3{margin:0 0 5px;font-size:17px}.card p{margin:0;color:var(--muted);font-size:14px}.city{display:block;background:#fff;padding:13px;border-radius:11px;text-decoration:none;color:var(--brand2);border:1px solid var(--line);font-weight:600}.city:hover{border-color:#a9c0ea;transform:translateY(-1px)}.notice{background:#fff8e6;border-left:4px solid #e6a700;padding:14px 16px;border-radius:9px;color:#694b00}.steps{counter-reset:step}.step{position:relative;padding-left:48px}.step:before{counter-increment:step;content:counter(step);position:absolute;left:0;top:0;width:32px;height:32px;border-radius:50%;background:#eaf1ff;color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:800}.form{display:grid;gap:12px;max-width:680px}.form input,.form textarea{padding:13px;border:1px solid #d5dce8;border-radius:9px;font-size:16px;font-family:inherit}.contactbar{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;background:#0b3b82;color:#fff;padding:24px;border-radius:16px}.contactbar p{margin:0;opacity:.9}.footer{margin-top:44px;padding:30px 0 42px;color:var(--muted);font-size:13px;border-top:1px solid var(--line)}.footerlinks{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px}.footerlinks a{color:var(--brand2);text-decoration:none}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nav{align-items:flex-start;padding-top:12px;padding-bottom:12px}.navlinks{justify-content:flex-end}}@media(max-width:560px){.grid{grid-template-columns:1fr}.hero{padding:30px 22px}.navlinks a:not(.navbtn){display:none}.hero p{font-size:15px}}
</style></head><body>
<header><div class="nav"><a class="brand" href="/">${esc(siteName(env))}</a><nav class="navlinks"><a href="/">首页</a><a href="/news">政策解读</a><a href="/contact">咨询服务</a>${phone ? `<a class="navbtn" href="tel:${esc(phone)}">☎ ${esc(phone)}</a>` : '<a class="navbtn" href="/contact">立即咨询</a>'}</nav></div></header>
<main class="wrap">${body}
<footer class="footer"><div class="footerlinks"><a href="/">首页</a><a href="/news">政策与实务</a><a href="/contact">提交咨询</a><a href="/sitemap.xml">网站地图</a></div><div>本网站仅提供依法依规的财税、发票及税务流程咨询服务，拒绝虚假交易、虚开发票、买卖发票及其他违法行为。具体事项以主管税务机关及现行法律法规为准。</div></footer></main></body></html>`, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
};

const cityUrl = (request: Request, name: string) => `${new URL(request.url).origin}/city/${encodeURIComponent(name)}`;

function home(request: Request, env: SeoEnv) {
  const origin = new URL(request.url).origin;
  const cities = SEO_CITIES.slice(0, 64).map((city) => `<a class="city" href="${cityUrl(request, city.name)}">${esc(city.name)}财税/发票咨询</a>`).join('');
  return page(
    `${siteName(env)}｜全国财税、发票与税务咨询服务`,
    '面向全国企业和个人提供依法依规的财税、发票及税务流程咨询服务，覆盖全国主要城市。',
    `<section class="hero"><div class="badges"><span class="badge">全国城市覆盖</span><span class="badge">企业/个人咨询</span><span class="badge">真实业务合规办理</span></div><h1>全国财税 · 发票 · 税务咨询服务</h1><p>不知道怎么准备材料？不知道发票、税务事项怎么走流程？先提交真实业务需求，我们用更容易理解的方式说明办理路径、材料和合规注意事项。</p><p class="notice">合规提示：涉及发票的业务必须以真实交易为基础。本网站不提供虚假交易、虚开发票、买卖发票或逃避税收监管等违法服务。</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px"><a class="btn" href="${origin}/contact">立即提交咨询</a><a class="btn secondary" href="#cities">按城市查找</a></div></section>
<section class="section"><h2>你可以咨询什么？</h2><p class="section-intro">围绕企业经营和个人真实业务场景，提供流程信息与合规咨询。</p><div class="grid"><div class="card"><h3>🧾 发票业务咨询</h3><p>了解发票开具、资料准备和常见流程。</p></div><div class="card"><h3>🏢 企业财税咨询</h3><p>企业日常财税事项、申报及经营流程咨询。</p></div><div class="card"><h3>📋 税务事项咨询</h3><p>帮助梳理具体税务事项需要关注的资料与步骤。</p></div><div class="card"><h3>📍 城市服务咨询</h3><p>按所在城市查看对应的服务信息和咨询入口。</p></div></div></section>
<section class="section"><h2>简单三步，提交真实需求</h2><div class="grid steps"><div class="card step"><h3>描述业务</h3><p>告诉我们所在城市、主体和真实业务情况。</p></div><div class="card step"><h3>确认材料</h3><p>根据具体事项了解需要准备的合法资料。</p></div><div class="card step"><h3>咨询办理</h3><p>按照实际业务和现行规定进行后续处理。</p></div></div></section>
<section class="section" id="cities"><h2>全国城市服务入口</h2><p class="section-intro">选择城市查看对应的财税、发票及税务咨询页面。</p><div class="grid">${cities}</div></section>
<section class="section"><div class="contactbar"><div><strong>需要具体咨询？</strong><p>提交真实业务需求，我们先帮你梳理事项。</p></div><a class="btn" href="${origin}/contact">提交咨询</a></div></section>
<section class="section"><h2>政策与实务解读</h2><p class="section-intro">坚持“来源 + 原创解读 + 企业实际价值”，帮助企业理解政策变化及实际办理影响。</p><a class="btn secondary" href="${origin}/news">查看政策解读</a></section>`,
    env,
    origin,
  );
}

function cityPage(request: Request, env: SeoEnv, cityName: string) {
  const match = SEO_CITIES.find((item) => item.name === cityName);
  const province = match?.province || '全国';
  const title = `${cityName}开票/发票/税务/财税咨询｜${siteName(env)}`;
  const description = `提供${cityName}及周边企业、个人的发票与税务流程咨询，说明常见材料、办理步骤和合规注意事项。`;
  const otherCities = SEO_CITIES.filter((item) => item.name !== cityName).slice(0, 32).map((item) => `<a class="city" href="${cityUrl(request, item.name)}">${esc(item.name)}</a>`).join('');
  return page(title, description,
    `<section class="hero"><div class="badges"><span class="badge">${esc(province)}</span><span class="badge">${esc(cityName)}</span><span class="badge">真实业务 · 合规咨询</span></div><h1>${esc(cityName)}发票与财税服务</h1><p>面向${esc(cityName)}企业和个人，提供发票、税务事项及财税流程的信息咨询，帮助你更清楚地了解办理路径和材料要求。</p><p class="notice">只处理真实、合法的业务。涉及发票的事项必须以真实交易和税法规定为基础。</p><a class="btn" href="/contact?city=${encodeURIComponent(cityName)}">咨询${esc(cityName)}业务</a></section>
<section class="section"><h2>${esc(cityName)}常见咨询方向</h2><div class="grid"><div class="card"><h3>发票咨询</h3><p>了解真实业务对应的发票开具与资料准备。</p></div><div class="card"><h3>税务咨询</h3><p>梳理具体税务事项、申报及办理流程。</p></div><div class="card"><h3>企业财税</h3><p>企业经营中的财税流程和合规注意事项。</p></div><div class="card"><h3>材料准备</h3><p>根据事项准备合同、订单及其他合法业务资料。</p></div></div></section>
<section class="section"><h2>办理前建议准备</h2><div class="card"><ul><li>真实交易背景及合同、订单等业务材料</li><li>企业或个人主体基本信息</li><li>根据具体事项依法需要的税务资料</li><li>需要特别说明的业务情况及时间要求</li></ul></div></section>
<section class="section"><div class="contactbar"><div><strong>正在处理${esc(cityName)}业务？</strong><p>提交真实需求，获取更具体的流程咨询。</p></div><a class="btn" href="/contact?city=${encodeURIComponent(cityName)}">立即咨询</a></div></section>
<section class="section"><h2>其他城市</h2><div class="grid">${otherCities}</div></section>`,
    env,
    cityUrl(request, cityName),
  );
}

function contactPage(request: Request, env: SeoEnv) {
  const city = new URL(request.url).searchParams.get('city') || '';
  const phone = sitePhone(env);
  return page(`提交财税咨询｜${siteName(env)}`, '提交企业或个人财税、发票、税务流程咨询需求。',
    `<section class="hero"><h1>提交咨询需求</h1><p>请填写真实业务需求，我们仅用于联系和业务咨询。</p>${phone ? `<p><strong>咨询电话：${esc(phone)}</strong></p>` : ''}<form class="form" method="post" action="/api/lead"><input name="city" value="${esc(city)}" placeholder="所在城市"><input name="name" required placeholder="称呼 / 企业名称"><input name="phone" required placeholder="联系电话"><textarea name="need" required rows="7" placeholder="请描述真实业务需求，例如：业务类型、发生城市、需要解决的问题等"></textarea><button class="btn" type="submit">提交咨询</button></form><p class="muted">请勿提交银行卡密码、身份证完整号码等与咨询无关的敏感信息。</p></section>`, env);
}

function newsPage(env: SeoEnv, request: Request) {
  return page(`财税政策解读｜${siteName(env)}`, '财税政策与发票实务信息，采用来源、原创解读、企业实际价值的结构。',
    `<section class="hero"><div class="badges"><span class="badge">政策信息</span><span class="badge">实务解读</span><span class="badge">合规提醒</span></div><h1>财税政策与发票实务解读</h1><p><strong>来源 + 原创解读 + 企业实际价值</strong></p><p>本站内容用于信息和流程参考。政策类内容应以税务机关、财政部门等权威来源的最新公告为准。</p></section><section class="section"><h2>内容原则</h2><div class="grid"><div class="card"><h3>来源</h3><p>标注公开、可核验的政策来源。</p></div><div class="card"><h3>原创解读</h3><p>用通俗语言解释政策对经营流程的影响。</p></div><div class="card"><h3>企业实际价值</h3><p>说明企业需要准备什么、注意什么、哪些场景不适用。</p></div></div></section><section class="section"><p class="notice">不以采集、拼接或虚构政策信息制造低质量页面。具体政策以主管部门最新发布为准。</p><a class="btn secondary" href="${new URL(request.url).origin}/">返回首页</a></section>`, env);
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
  if (request.method === 'GET' && env.INDEXNOW_KEY && url.pathname === `/${env.INDEXNOW_KEY}.txt`) return new Response(env.INDEXNOW_KEY, { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
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
      body: JSON.stringify({ host: new URL(origin).host, key: env.INDEXNOW_KEY, keyLocation: `${origin}/${env.INDEXNOW_KEY}.txt`, urlList: [`${origin}/`, `${origin}/sitemap.xml`] }),
    });
  } catch (error) { console.warn('[indexnow] ping failed', error); }
}
