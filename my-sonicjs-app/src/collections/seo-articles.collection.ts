import type { CollectionConfig } from '@sonicjs-cms/core';

export default {
  name: 'seo_article',
  displayName: 'SEO政策解读',
  slug: 'seo-articles',
  description: '管理来源、原创解读和企业实际价值内容。',
  icon: '📰',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: '标题', required: true, maxLength: 200 },
      slug: { type: 'slug', title: 'URL Slug', required: true, maxLength: 200 },
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
