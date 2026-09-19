import type { CollectionConfig } from '@sonicjs-cms/core';

/**
 * 政策解读 / SEO 资讯
 * 发布时建议：标题含核心关键词；summary 写 meta 描述；seoKeywords 引用后台「AI关键词」。
 * 在后台点「发布」后 is_published=1，前台 /news 与 /article/:slug 自动展示。
 */
export default {
  name: 'seo_article',
  displayName: '政策解读 / SEO资讯',
  slug: 'seo-articles',
  description:
    '发布后前台自动展示。结构：来源 + 原创解读 + 企业价值。关键词请与「系统设置 → AI关键词」一致。',
  icon: '📰',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: '文章标题（含核心词）', required: true, maxLength: 200 },
      slug: { type: 'slug', title: '页面地址（URL）', required: true, maxLength: 200 },
      summary: {
        type: 'string',
        title: '摘要 / SEO描述',
        maxLength: 300,
        description: '用于列表与 meta description，建议 80–160 字',
      },
      seoTitle: { type: 'string', title: 'SEO标题（可空，默认用文章标题）', maxLength: 200 },
      seoKeywords: {
        type: 'string',
        title: '本篇关键词（逗号分隔）',
        maxLength: 300,
        description: '可从后台 AI关键词 核心词/长尾词中选用',
      },
      sourceName: { type: 'string', title: '来源名称', maxLength: 200 },
      sourceUrl: { type: 'string', title: '来源链接', maxLength: 1000 },
      interpretation: { type: 'lexical', title: '原创解读', required: true },
      businessValue: { type: 'lexical', title: '企业实际价值', required: true },
      geoCity: {
        type: 'string',
        title: '关联城市（GEO，可空）',
        maxLength: 80,
        description: '填写后利于地域 SEO，如：深圳',
      },
      publishedAt: { type: 'datetime', title: '发布时间' },
    },
    required: ['title', 'slug', 'interpretation', 'businessValue'],
  },
  listFields: ['title', 'sourceName', 'geoCity', 'status', 'publishedAt'],
  searchFields: ['title', 'summary', 'seoKeywords', 'sourceName', 'interpretation', 'businessValue', 'geoCity'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',
  managed: true,
  isActive: true,
  access: { public: ['read'] },
} satisfies CollectionConfig;
