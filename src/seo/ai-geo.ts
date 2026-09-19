/** AI 关键词 SEO + GEO（Generative Engine Optimization）共享逻辑 */

const SETTINGS_TYPE = 'site_settings';
const SETTINGS_TENANT = 'default';

export type AiSeoSettings = {
  /** 核心关键词，逗号分隔 */
  coreKeywords: string;
  /** 长尾关键词，每行一个 */
  longTailKeywords: string;
  /** AI 写作提示词（给运营参考） */
  aiWritingPrompt: string;
  /** 是否自动把关键词注入 meta keywords */
  injectMetaKeywords: boolean;
};

export type GeoSettings = {
  /** 是否输出 JSON-LD Organization / LocalBusiness */
  enabled: boolean;
  /** 业务类型：LocalBusiness / ProfessionalService / Organization */
  businessType: string;
  /** 对外展示名称 */
  businessName: string;
  /** 服务区域描述，如：全国 / 北京、上海、深圳 */
  serviceArea: string;
  /** 详细地址（可选） */
  address: string;
  /** 城市 */
  city: string;
  /** 省份 */
  region: string;
  /** 国家代码 */
  country: string;
  /** 电话 */
  telephone: string;
  /** 给 ChatGPT / Perplexity 等的简明业务说明 */
  aiSummary: string;
  /** FAQ 问答对，格式：问|答 每行一对 */
  faqPairs: string;
};

export const defaultAiSeo = (): AiSeoSettings => ({
  coreKeywords: '代理记账,代开发票,税务申报,财税咨询,工商注册',
  longTailKeywords: '小微企业代理记账\n电子发票代开\n增值税申报流程\n公司注销税务处理',
  aiWritingPrompt: '请用通俗中文解释财税政策对企业的影响，结构：来源 → 解读 → 企业价值，避免违法建议。',
  injectMetaKeywords: true,
});

export const defaultGeo = (): GeoSettings => ({
  enabled: true,
  businessType: 'ProfessionalService',
  businessName: '全国财税发票服务',
  serviceArea: '中国全国主要城市',
  address: '',
  city: '',
  region: '',
  country: 'CN',
  telephone: '',
  aiSummary:
    '本站提供依法合规的代理记账、代开发票咨询、税务申报辅导与财税咨询服务，覆盖全国主要城市，不提供任何违法发票服务。',
  faqPairs:
    '什么是代理记账？|代理记账是指由具备资质的机构为企业代为办理会计核算、记账报税等业务。\n如何代开发票？|应通过正规税务渠道或委托合法机构办理，需有真实交易背景。',
});

async function loadCategory(db: D1Database | undefined, slug: string): Promise<Record<string, any>> {
  if (!db) return {};
  try {
    const row = await db
      .prepare(
        `SELECT data FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
      )
      .bind(SETTINGS_TYPE, slug, SETTINGS_TENANT)
      .first<{ data?: string }>();
    return row?.data ? JSON.parse(row.data) : {};
  } catch {
    return {};
  }
}

export async function loadAiSeo(db?: D1Database): Promise<AiSeoSettings> {
  const base = defaultAiSeo();
  const raw = await loadCategory(db, 'ai_seo');
  return {
    coreKeywords: String(raw.coreKeywords || base.coreKeywords).slice(0, 500),
    longTailKeywords: String(raw.longTailKeywords || base.longTailKeywords).slice(0, 2000),
    aiWritingPrompt: String(raw.aiWritingPrompt || base.aiWritingPrompt).slice(0, 2000),
    injectMetaKeywords: raw.injectMetaKeywords !== false,
  };
}

export async function loadGeo(db?: D1Database): Promise<GeoSettings> {
  const base = defaultGeo();
  const raw = await loadCategory(db, 'geo');
  const lead = await loadCategory(db, 'lead');
  return {
    enabled: raw.enabled !== false,
    businessType: String(raw.businessType || base.businessType).slice(0, 80),
    businessName: String(raw.businessName || base.businessName).slice(0, 120),
    serviceArea: String(raw.serviceArea || base.serviceArea).slice(0, 300),
    address: String(raw.address || '').slice(0, 300),
    city: String(raw.city || '').slice(0, 80),
    region: String(raw.region || '').slice(0, 80),
    country: String(raw.country || base.country).slice(0, 8),
    telephone: String(raw.telephone || lead.contactPhone || base.telephone).slice(0, 40),
    aiSummary: String(raw.aiSummary || base.aiSummary).slice(0, 1000),
    faqPairs: String(raw.faqPairs || base.faqPairs).slice(0, 4000),
  };
}

const esc = (v: string) =>
  v.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '');

/** 输出供 AI 引擎与搜索引擎消费的 JSON-LD */
export function geoJsonLd(geo: GeoSettings, siteUrl: string): string {
  if (!geo.enabled) return '';
  const graphs: Record<string, unknown>[] = [];

  const org: Record<string, unknown> = {
    '@type': geo.businessType || 'ProfessionalService',
    name: geo.businessName,
    url: siteUrl,
    description: geo.aiSummary,
    areaServed: geo.serviceArea,
  };
  if (geo.telephone) org.telephone = geo.telephone;
  if (geo.address || geo.city) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: geo.address || undefined,
      addressLocality: geo.city || undefined,
      addressRegion: geo.region || undefined,
      addressCountry: geo.country || 'CN',
    };
  }
  graphs.push(org);

  const faqs = geo.faqPairs
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [q, a] = line.split('|').map((s) => s.trim());
      if (!q || !a) return null;
      return {
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      };
    })
    .filter(Boolean);

  if (faqs.length) {
    graphs.push({
      '@type': 'FAQPage',
      mainEntity: faqs,
    });
  }

  const payload = {
    '@context': 'https://schema.org',
    '@graph': graphs,
  };
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

export function keywordsMeta(ai: AiSeoSettings): string {
  if (!ai.injectMetaKeywords || !ai.coreKeywords.trim()) return '';
  const kw = ai.coreKeywords
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30)
    .join(',');
  return `<meta name="keywords" content="${kw.replace(/"/g, '&quot;')}">`;
}
