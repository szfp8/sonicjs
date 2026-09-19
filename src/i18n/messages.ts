import type { LanguageCode } from './config';

type Messages = {
  siteName: string;
  siteTagline: string;
  homeTitle: string;
  homeDesc: string;
  homeHeroTitle: string;
  homeHeroSub: string;
  homeHeroBody: string;
  homeNotice: string;
  homeContactBtn: string;
  homeSearchPlaceholder: string;
  homeSearchBtn: string;
  homeCitiesTitle: string;
  homeHotServices: string;
  homeNewsTitle: string;
  homeNewsBody: string;
  homeNewsBtn: string;
  homeWechatTitle: string;
  homeWechatBody: string;
  homeWechatBtn: string;
  homeAdvisorTitle: string;
  homeAdvisorBtn: string;
  navHome: string;
  navServices: string;
  navCities: string;
  navNews: string;
  navAbout: string;
  navWechat: string;
  navContact: string;
  navSearch: string;
  newsTitle: string;
  newsDesc: string;
  newsEmpty: string;
  newsReadMore: string;
  wechatTitle: string;
  wechatDesc: string;
  wechatEmpty: string;
  wechatOpenOriginal: string;
  wechatAccount: string;
  contactTitle: string;
  contactDesc: string;
  contactSubmit: string;
  contactSuccess: string;
  contactName: string;
  contactPhone: string;
  contactNeed: string;
  contactCity: string;
  footer: string;
  language: string;
  searchPlaceholder: string;
  searchResults: string;
  noResults: string;
  backHome: string;
  source: string;
  interpretation: string;
  businessValue: string;
  policyNotice: string;
  phoneDisplay: string;
};

const zh: Messages = {
  siteName: '财税服务',
  siteTagline: '专业 · 高效 · 可信赖',
  homeTitle: '专业财税服务 助力企业发展',
  homeDesc: '代理记账 · 代开发票 · 税务申报 · 财税咨询，覆盖全国主要城市。',
  homeHeroTitle: '专业财税服务 助力企业发展',
  homeHeroSub: '代理记账 · 代开发票 · 税务申报 · 财税咨询',
  homeHeroBody: '围绕企业日常经营中的发票、税务申报、财税流程和合规咨询，提供清晰的办理路径与材料说明。',
  homeNotice: '合规提示：仅接受真实交易和合法业务场景，不提供虚假交易、虚开发票、买卖发票等服务。',
  homeContactBtn: '立即咨询',
  homeSearchPlaceholder: '请输入您想搜索的服务，如：代理记账、发票、税务…',
  homeSearchBtn: '搜索',
  homeCitiesTitle: '全国服务城市',
  homeHotServices: '热门服务',
  homeNewsTitle: '最新财税资讯',
  homeNewsBody: '政策解读与实务指南，帮助企业理解办理影响。',
  homeNewsBtn: '查看更多资讯 →',
  homeWechatTitle: '微信文章',
  homeWechatBody: '汇总公众号推送的财税、发票相关文章。',
  homeWechatBtn: '查看微信文章',
  homeAdvisorTitle: '专业财税顾问\n1对1解决企业财税问题',
  homeAdvisorBtn: '立即咨询',
  navHome: '首页',
  navServices: '服务项目',
  navCities: '服务城市',
  navNews: '财税资讯',
  navAbout: '关于我们',
  navWechat: '微信文章',
  navContact: '提交咨询',
  navSearch: '搜索',
  newsTitle: '财税政策与发票实务解读',
  newsDesc: '财税政策与发票实务信息，采用来源、原创解读、企业实际价值的结构。',
  newsEmpty: '暂无已发布文章，请在后台发布内容。',
  newsReadMore: '了解更多 →',
  wechatTitle: '微信文章',
  wechatDesc: '公众号推送的财税、发票相关文章汇总。',
  wechatEmpty: '暂无微信文章。',
  wechatOpenOriginal: '打开微信原文',
  wechatAccount: '公众号',
  contactTitle: '提交财税咨询',
  contactDesc: '提交企业或个人财税、发票、税务流程咨询需求。',
  contactSubmit: '提交咨询',
  contactSuccess: '提交成功',
  contactName: '称呼/企业名称',
  contactPhone: '联系电话',
  contactNeed: '请描述真实业务需求',
  contactCity: '所在城市',
  footer: '本网站仅提供依法依规的财税、发票及税务流程咨询服务，拒绝虚假发票、买卖发票及其他违法行为。',
  language: '语言',
  searchPlaceholder: '搜索关键词',
  searchResults: '搜索结果',
  noResults: '没有找到匹配内容。',
  backHome: '返回首页',
  source: '来源',
  interpretation: '原创解读',
  businessValue: '企业实际价值',
  policyNotice: '本文用于信息参考，具体政策以主管部门最新公开文件为准。',
  phoneDisplay: '400-123-4567',
};

const en: Messages = {
  siteName: 'Tax Services',
  siteTagline: 'Professional · Efficient · Trusted',
  homeTitle: 'Professional Tax Services for Business Growth',
  homeDesc: 'Bookkeeping, invoicing, tax filing and consulting nationwide.',
  homeHeroTitle: 'Professional Tax Services for Business Growth',
  homeHeroSub: 'Bookkeeping · Invoicing · Tax filing · Consulting',
  homeHeroBody: 'Clear guidance on invoicing, tax filing and compliance.',
  homeNotice: 'Only genuine lawful business. No fake invoices.',
  homeContactBtn: 'Contact us',
  homeSearchPlaceholder: 'Search services, e.g. bookkeeping, invoice…',
  homeSearchBtn: 'Search',
  homeCitiesTitle: 'Service cities',
  homeHotServices: 'Popular services',
  homeNewsTitle: 'Latest tax insights',
  homeNewsBody: 'Policy interpretation and practical guides.',
  homeNewsBtn: 'More insights →',
  homeWechatTitle: 'WeChat articles',
  homeWechatBody: 'Curated public-account posts.',
  homeWechatBtn: 'Browse WeChat',
  homeAdvisorTitle: 'Tax advisors\n1-on-1 business support',
  homeAdvisorBtn: 'Consult now',
  navHome: 'Home',
  navServices: 'Services',
  navCities: 'Cities',
  navNews: 'Insights',
  navAbout: 'About',
  navWechat: 'WeChat',
  navContact: 'Contact',
  navSearch: 'Search',
  newsTitle: 'Tax policy & practice',
  newsDesc: 'Source + interpretation + business value.',
  newsEmpty: 'No articles yet.',
  newsReadMore: 'Read more →',
  wechatTitle: 'WeChat articles',
  wechatDesc: 'Curated WeChat posts.',
  wechatEmpty: 'No WeChat articles yet.',
  wechatOpenOriginal: 'Open original',
  wechatAccount: 'Account',
  contactTitle: 'Submit inquiry',
  contactDesc: 'Send your tax / invoice inquiry.',
  contactSubmit: 'Submit',
  contactSuccess: 'Submitted',
  contactName: 'Name / company',
  contactPhone: 'Phone',
  contactNeed: 'Describe your need',
  contactCity: 'City',
  footer: 'Lawful tax and invoice consulting only.',
  language: 'Language',
  searchPlaceholder: 'Search',
  searchResults: 'Results',
  noResults: 'No matches.',
  backHome: 'Home',
  source: 'Source',
  interpretation: 'Interpretation',
  businessValue: 'Business value',
  policyNotice: 'For reference only.',
  phoneDisplay: '400-123-4567',
};

const ja: Messages = { ...en, siteName: '税務サービス', navHome: 'ホーム', language: '言語' };
const ko: Messages = { ...en, siteName: '세무 서비스', navHome: '홈', language: '언어' };
const fr: Messages = { ...en, siteName: 'Services fiscaux', navHome: 'Accueil', language: 'Langue' };
const de: Messages = { ...en, siteName: 'Steuerdienste', navHome: 'Start', language: 'Sprache' };
const es: Messages = { ...en, siteName: 'Servicios fiscales', navHome: 'Inicio', language: 'Idioma' };

const ALL: Record<LanguageCode, Messages> = { zh, en, ja, ko, fr, de, es };

export function t(lang: LanguageCode): Messages {
  return ALL[lang] || zh;
}

export type { Messages };
