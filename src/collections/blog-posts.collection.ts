/**
 * 网站资讯集合
 *
 * 面向小白后台用户：用于管理网站资讯/文章，不使用 SonicJS 的通用博客术语。
 */

import type { CollectionConfig } from '@sonicjs-cms/core';

export default {
  name: 'blog_post',
  displayName: '网站资讯',
  slug: 'blog-posts',
  description: '管理网站资讯、行业动态和获客文章。',
  icon: '📰',

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
      content: {
        type: 'lexical',
        title: '文章正文',
        required: true,
      },
      author: {
        type: 'user',
        title: '作者',
        required: true,
      },
      publishedAt: {
        type: 'datetime',
        title: '发布时间',
      },
    },
    required: ['title', 'slug', 'content', 'author'],
  },

  listFields: ['title', 'author', 'status', 'publishedAt'],
  searchFields: ['title', 'content', 'author'],
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
