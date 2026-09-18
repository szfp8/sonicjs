import type { CollectionConfig } from '@sonicjs-cms/core';

export default {
  name: 'seo_city_page',
  displayName: 'SEO城市页面',
  slug: 'seo-city-pages',
  description: '管理全国城市落地页的标题、关键词、描述和正文。',
  icon: '📍',
  schema: {
    type: 'object',
    properties: {
      city: { type: 'string', title: '城市名称', required: true, maxLength: 80 },
      province: { type: 'string', title: '省份 / 地区', maxLength: 80 },
      title: { type: 'string', title: 'SEO标题', required: true, maxLength: 200 },
      metaDescription: { type: 'string', title: 'SEO描述', maxLength: 300 },
      keywords: { type: 'string', title: '目标关键词', maxLength: 500 },
      content: { type: 'lexical', title: '城市页面正文', required: true },
    },
    required: ['city', 'title', 'content'],
  },
  listFields: ['city', 'province', 'title', 'status'],
  searchFields: ['city', 'province', 'title', 'keywords', 'content'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',
  managed: true,
  isActive: true,
  access: { public: ['read'] },
} satisfies CollectionConfig;
