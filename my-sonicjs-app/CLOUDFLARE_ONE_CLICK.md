# Cloudflare 一键部署版

这个目录现在就是实际生产 Cloudflare Workers 应用根目录，可以直接连接 Cloudflare Workers Builds。

## Cloudflare Workers Builds

- GitHub Repository: `szfp8/sonicjs`
- Branch: `main`
- Root directory: `my-sonicjs-app`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker: `szfp8-tax-seo`

## 固定资源

- D1: `szfp8-tax-seo-db`
- D1 ID: `ef7afcee-e86e-4c42-8ea5-d893fa8394ce`
- R2: `szfp8-tax-seo-media`
- Site: `https://szfp8.com`

## D1 原则

普通代码部署**不执行 D1 migration**。

`npx wrangler deploy` 只部署 Worker。

数据库结构升级只在真正需要时单独执行 `migrations/`，避免每次 SEO 代码发布都触碰 D1。

## 登录

继续使用 SonicJS 原有 Better Auth / RBAC。

不使用 Claude 参考包里的独立 JWT 登录系统。

管理员密码不写进 GitHub；`BETTER_AUTH_SECRET` 使用 Cloudflare Worker Secret。

## 已整合功能

- 中文 SonicJS 后台界面
- 网站基础设置
- SEO 设置
- 获客设置
- 314 个全国城市 SEO 页面
- SEO 文章 / 政策解读
- 来源 + 原创解读 + 企业实际价值
- `/news` 文章列表
- `/article/<slug>` 文章详情
- `/search?q=关键词` 站内搜索
- `/sitemap.xml`
- `/robots.txt`
- IndexNow
- `/contact` 获客入口
- D1
- R2
- Cloudflare Workers

## 部署完成后检查

1. Cloudflare Build 显示 Success。
2. Worker `szfp8-tax-seo` 有 Active Deployment。
3. `https://szfp8.com/` 首页打开。
4. `https://szfp8.com/auth/login` 登录页面打开。
5. `/admin` 后台打开。
6. `/robots.txt`、`/sitemap.xml`、`/news`、`/contact` 正常。
7. 任意 `/city/深圳`、`/city/广州` 等城市页正常。

仓库不保存固定管理员密码，也不会在普通部署时自动迁移 D1。
