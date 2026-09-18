/**
 * 微信文章推送栏目
 *
 * 用于管理和展示公众号推送文章：标题、摘要、封面、原文链接等。
 * 内容以链接跳转微信原文为主，站点仅做聚合与 SEO 展示。
 */

import type { CollectionConfig } from '@sonicjs-cms/core';

export default {
  name: 'wechat_article',
  displayName: '微信文章',
  slug: 'wechat-articles',
  description: '管理微信公众号推送文章，用于前台「微信文章」栏目展示与跳转原文。',
  icon: '💬',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: '文章标题',
        required: true,
        maxLength: 200,
      },
      slug: {
        type: 'slug',
        title: '页面地址（URL）',
        required: true,
        maxLength: 200,
      },
      summary: {
        type: 'string',
        title: '摘要',
        maxLength: 500,
      },
      coverUrl: {
        type: 'string',
        title: '封面图链接',
        maxLength: 1000,
      },
      originalUrl: {
        type: 'string',
        title: '微信原文链接',
        required: true,
        maxLength: 1000,
      },
      accountName: {
        type: 'string',
        title: '公众号名称',
        maxLength: 120,
      },
      author: {
        type: 'string',
        title: '作者',
        maxLength: 80,
      },
      language: {
        type: 'string',
        title: '语言',
        maxLength: 10,
        description: 'zh / en / ja / ko 等，用于多语言筛选',
      },
      publishedAt: {
        type: 'datetime',
        title: '推送/发布时间',
      },
      content: {
        type: 'lexical',
        title: '站内补充说明（可选）',
      },
    },
    required: ['title', 'slug', 'originalUrl'],
  },

  listFields: ['title', 'accountName', 'language', 'status', 'publishedAt'],
  searchFields: ['title', 'summary', 'accountName', 'author', 'content'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',

  managed: true,
  isActive: true,

  access: {
    public: ['read'],
  },

  cache: {
    enabled: true,
    ttl: 5,
  },
} satisfies CollectionConfig;
