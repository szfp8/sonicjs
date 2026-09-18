import type { LanguageCode } from './config';

type Messages = {
  siteName: string;
  homeTitle: string;
  homeDesc: string;
  homeHeroTitle: string;
  homeHeroBody: string;
  homeNotice: string;
  homeContactBtn: string;
  homeCitiesTitle: string;
  homeNewsTitle: string;
  homeNewsBody: string;
  homeNewsBtn: string;
  homeWechatTitle: string;
  homeWechatBody: string;
  homeWechatBtn: string;
  navHome: string;
  navNews: string;
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
};

const zh: Messages = {
  siteName: '全国财税发票服务',
  homeTitle: '全国城市发票与财税服务',
  homeDesc: '面向全国企业和个人提供依法依规的发票、税务、财税流程咨询服务，覆盖主要城市。',
  homeHeroTitle: '全国发票与财税服务',
  homeHeroBody: '围绕企业日常经营中的发票、税务申报、财税流程和合规咨询，提供清晰的办理路径与材料说明。',
  homeNotice: '合规提示：仅接受真实交易和合法业务场景，不提供虚假交易、虚开发票、买卖发票等服务。',
  homeContactBtn: '提交咨询',
  homeCitiesTitle: '全国城市服务入口',
  homeNewsTitle: '政策与实务解读',
  homeNewsBody: '内容栏目坚持“来源 + 原创解读 + 企业实际价值”，帮助企业理解政策变化与实际办理影响。',
  homeNewsBtn: '查看财税政策解读',
  homeWechatTitle: '微信文章',
  homeWechatBody: '汇总公众号推送的财税、发票相关文章，点击即可跳转微信原文阅读。',
  homeWechatBtn: '查看微信文章',
  navHome: '首页',
  navNews: '政策解读',
  navWechat: '微信文章',
  navContact: '提交咨询',
  navSearch: '搜索',
  newsTitle: '财税政策与发票实务解读',
  newsDesc: '财税政策与发票实务信息，采用来源、原创解读、企业实际价值的结构。',
  newsEmpty: '暂无已发布文章，请在后台「政策解读 / SEO资讯」中发布内容。',
  newsReadMore: '阅读全文 →',
  wechatTitle: '微信文章',
  wechatDesc: '公众号推送的财税、发票相关文章汇总，点击跳转微信原文。',
  wechatEmpty: '暂无微信文章，请在后台「微信文章」中添加推送内容。',
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
};

const en: Messages = {
  siteName: 'National Tax & Invoice Services',
  homeTitle: 'Invoice & Tax Services Across Cities',
  homeDesc: 'Compliant invoice, tax filing and finance consulting for businesses and individuals nationwide.',
  homeHeroTitle: 'Nationwide Invoice & Tax Services',
  homeHeroBody: 'Clear guidance on invoicing, tax filing, finance processes and compliance for day-to-day business.',
  homeNotice: 'Compliance notice: Only genuine transactions and lawful scenarios. No fake invoices or illegal services.',
  homeContactBtn: 'Contact us',
  homeCitiesTitle: 'City service portals',
  homeNewsTitle: 'Policy & practice insights',
  homeNewsBody: 'Articles follow “source + original interpretation + business value” to help you act on policy changes.',
  homeNewsBtn: 'View policy insights',
  homeWechatTitle: 'WeChat articles',
  homeWechatBody: 'Curated public-account posts on tax and invoicing. Open the original WeChat article with one click.',
  homeWechatBtn: 'Browse WeChat articles',
  navHome: 'Home',
  navNews: 'Insights',
  navWechat: 'WeChat',
  navContact: 'Contact',
  navSearch: 'Search',
  newsTitle: 'Tax policy & invoice practice',
  newsDesc: 'Policy and practice notes structured as source, interpretation, and business value.',
  newsEmpty: 'No published articles yet. Publish under “SEO Articles” in admin.',
  newsReadMore: 'Read more →',
  wechatTitle: 'WeChat articles',
  wechatDesc: 'Curated WeChat posts on tax and invoicing. Jump to the original article.',
  wechatEmpty: 'No WeChat articles yet. Add them under “WeChat Articles” in admin.',
  wechatOpenOriginal: 'Open original WeChat article',
  wechatAccount: 'Account',
  contactTitle: 'Submit a tax inquiry',
  contactDesc: 'Send your business or personal tax / invoice inquiry.',
  contactSubmit: 'Submit',
  contactSuccess: 'Submitted successfully',
  contactName: 'Name / company',
  contactPhone: 'Phone',
  contactNeed: 'Describe your real business need',
  contactCity: 'City',
  footer: 'This site only provides lawful tax, invoice and process consulting. Illegal services are refused.',
  language: 'Language',
  searchPlaceholder: 'Search keywords',
  searchResults: 'Search results',
  noResults: 'No matching content.',
  backHome: 'Back to home',
  source: 'Source',
  interpretation: 'Interpretation',
  businessValue: 'Business value',
  policyNotice: 'For reference only. Always check the latest official announcements.',
};

const ja: Messages = {
  ...en,
  siteName: '全国税務・請求書サービス',
  homeTitle: '全国都市の請求書・税務サービス',
  homeHeroTitle: '全国の請求書・税務サービス',
  navHome: 'ホーム',
  navNews: '政策解説',
  navWechat: 'WeChat記事',
  navContact: 'お問い合わせ',
  wechatTitle: 'WeChat記事',
  wechatOpenOriginal: 'WeChat原文を開く',
  contactSubmit: '送信',
  backHome: 'ホームへ',
  language: '言語',
  footer: '本サイトは適法な税務・請求書・手続き相談のみを提供します。',
};

const ko: Messages = {
  ...en,
  siteName: '전국 세무·세금계산서 서비스',
  homeTitle: '전국 도시 세금계산서·세무 서비스',
  homeHeroTitle: '전국 세금계산서·세무 서비스',
  navHome: '홈',
  navNews: '정책 해설',
  navWechat: '위챗 글',
  navContact: '문의',
  wechatTitle: '위챗 글',
  wechatOpenOriginal: '위챗 원문 열기',
  contactSubmit: '제출',
  backHome: '홈으로',
  language: '언어',
  footer: '본 사이트는 합법적인 세무·세금계산서·절차 상담만 제공합니다.',
};

const fr: Messages = {
  ...en,
  siteName: 'Services fiscaux et factures',
  navHome: 'Accueil',
  navNews: 'Analyses',
  navWechat: 'WeChat',
  navContact: 'Contact',
  language: 'Langue',
};

const de: Messages = {
  ...en,
  siteName: 'Steuer- & Rechnungsdienste',
  navHome: 'Start',
  navNews: 'Einblicke',
  navWechat: 'WeChat',
  navContact: 'Kontakt',
  language: 'Sprache',
};

const es: Messages = {
  ...en,
  siteName: 'Servicios fiscales y facturas',
  navHome: 'Inicio',
  navNews: 'Análisis',
  navWechat: 'WeChat',
  navContact: 'Contacto',
  language: 'Idioma',
};

const ALL: Record<LanguageCode, Messages> = {
  zh,
  en,
  ja,
  ko,
  fr,
  de,
  es,
};

export function t(lang: LanguageCode): Messages {
  return ALL[lang] || zh;
}

export type { Messages };
