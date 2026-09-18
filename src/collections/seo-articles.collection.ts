import type { CollectionConfig } from '@sonicjs-cms/core';

export default {
  name: 'seo_article',
  displayName: '政策解读 / SEO资讯',
  slug: 'seo-articles',
  description: '发布政策资讯时，按“来源 + 原创解读 + 企业实际价值”整理内容。',
  icon: '📰',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: '文章标题', required: true, maxLength: 200 },
      slug: { type: 'slug', title: '页面地址（URL）', required: true, maxLength: 200 },
      sourceName: { type: 'string', title: '来源名称', maxLength: 200 },
      sourceUrl: { type: 'string', title: '来源链接', maxLength: 1000 },
      interpretation: { type: 'lexical', title: '原创解读', required: true },
      businessValue: { type: 'lexical', title: '企业实际价值', required: true },
      publishedAt: { type: 'datetime', title: '发布时间' },
    },
    required: ['title', 'slug', 'interpretation', 'businessValue'],
  },
  listFields: ['title', 'sourceName', 'status', 'publishedAt'],
  searchFields: ['title', 'sourceName', 'interpretation', 'businessValue'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',
  managed: true,
  isActive: true,
  access: { public: ['read'] },
} satisfies CollectionConfig;
