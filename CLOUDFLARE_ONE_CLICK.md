# 财税 SEO Cloudflare 一键部署版

本仓库现在把 `my-sonicjs-app` 作为实际生产应用目录，SonicJS 核心继续保留在 `packages/core`，不改登录体系。

## Cloudflare Workers Builds（推荐）

- Repository: `szfp8/sonicjs`
- Branch: `main`
- **Root directory: `my-sonicjs-app`**
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker: `szfp8-tax-seo`

Cloudflare Workers Builds 官方流程是“Build command（可选）→ Deploy command”，默认部署命令就是 `npx wrangler deploy`。本项目已经提供独立的 `my-sonicjs-app/wrangler.toml`，因此不需要 Cloudflare 自动生成另一套配置。

## 固定生产资源

- D1: `szfp8-tax-seo-db`
- D1 ID: `ef7afcee-e86e-4c42-8ea5-d893fa8394ce`
- R2: `szfp8-tax-seo-media`
- Site: `https://szfp8.com`

## 本版关键原则

### 1. 代码部署与 D1 迁移彻底分开

普通 Cloudflare 部署只执行：

`npx wrangler deploy`

不会自动执行：

`wrangler d1 migrations apply --remote`

这样每次 SEO/前台/后台代码更新都不会因为历史 D1 migration 状态导致部署失败，也不会为了普通代码部署额外消耗 D1。

只有真正增加数据库结构时，才单独处理 `my-sonicjs-app/migrations/`。

### 2. 不重建 SonicJS 登录体系

当前生产应用继续使用 SonicJS 原有 Better Auth / RBAC / D1 用户体系。

不要把 Claude 参考包里的独立 JWT 登录系统覆盖进来。

`BETTER_AUTH_SECRET` 继续作为 Cloudflare Worker Secret 使用，不写入 GitHub。

### 3. SEO 模块不新增数据库表

当前 SEO 功能优先复用 SonicJS 已有 document/content 能力：

- 314 个城市 SEO 页面
- SEO 文章 / 政策解读集合
- 来源 + 原创解读 + 企业实际价值
- 获客表单
- SEO 设置
- IndexNow
- robots.txt
- sitemap.xml
- 动态文章页
- 站内搜索

新增的文章页、搜索和动态 Sitemap 只读取现有 `documents`，不增加 migration。

### 4. Cloudflare 低频 Cron

生产 Cron 固定为：

`0 */6 * * *`

避免为了 SEO 功能进行高频、无意义的 D1 请求。

## 生产入口

Cloudflare Workers 实际入口：

`my-sonicjs-app/src/entrypoint.ts`

它在不改变 SonicJS 核心的前提下，给原有 Worker 增加：

- `/news`
- `/article/<slug>`
- `/search?q=关键词`
- 动态文章 Sitemap

原有 `/auth/*`、`/admin/*`、SonicJS API 和后台功能继续交给 SonicJS 核心处理。

## 部署后入口

- 首页：`/`
- 登录：`/auth/login`
- 后台：`/admin`
- SEO 设置：后台“网站设置”中的 SEO 区域
- 获客设置：后台“网站设置”中的获客区域
- 城市页面：`/city/<城市名>`
- 政策资讯：`/news`
- 单篇文章：`/article/<slug>`
- 站内搜索：`/search?q=发票`
- Sitemap：`/sitemap.xml`
- Robots：`/robots.txt`
- 获客：`/contact`

## 不需要做的事情

- 不需要重新修复 SonicJS 登录
- 不需要重新创建管理员账号
- 不需要手动修改源代码
- 不需要每次部署重新迁移 D1
- 不需要把管理员密码写进 GitHub
- 不需要为了 SEO 菜单新增大量 D1 表
- 不需要使用 Claude 版本的独立登录系统
