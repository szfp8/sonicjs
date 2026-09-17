# 财税 SEO Cloudflare 一键部署版

本仓库现在只以 `szfp8-tax-seo` 作为生产 Worker。

## Cloudflare Workers Builds

- Repository: `szfp8/sonicjs`
- Branch: `main`
- Root directory: 留空
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker: `szfp8-tax-seo`

## 固定生产资源

- D1: `szfp8-tax-seo-db`
- D1 ID: `ef7afcee-e86e-4c42-8ea5-d893fa8394ce`
- R2: `szfp8-tax-seo-media`
- Site: `https://szfp8.com`

## 本版的关键原则

### 1. 普通部署不自动迁移 D1

Cloudflare 每次代码部署只执行：

`npx wrangler deploy`

不会自动执行：

`wrangler d1 migrations apply --remote`

这样代码更新不会因为旧数据库状态、重复迁移或无意义 D1 请求导致部署失败。

数据库迁移统一保留在：

`my-sonicjs-app/migrations/`

只有真正需要升级数据库结构时才单独执行迁移。

### 2. 不在代码里写死管理员密码

生产必须通过 Cloudflare Worker Secret 提供：

`BETTER_AUTH_SECRET`

管理员邮箱和密码由第一次注册/现有 SonicJS Auth 流程处理，不写入 GitHub。

### 3. D1 只承担真正需要的数据

SEO 页面、城市页面、文章、获客表单继续优先复用现有 SonicJS document/content 能力，不因为增加后台菜单就随意创建新表。

### 4. 定时任务低频运行

生产 Cron 固定为每 6 小时一次：

`0 */6 * * *`

避免为了 SEO 功能进行无意义的高频 D1 请求。

## 生产入口

Worker 入口：

`my-sonicjs-app/src/index.ts`

SEO：

`my-sonicjs-app/src/seo/`

内容集合：

`my-sonicjs-app/src/collections/`

D1 migrations：

`my-sonicjs-app/migrations/`

## 部署后

Cloudflare Build 成功后访问：

`https://szfp8.com/`

登录：

`https://szfp8.com/auth/login`

SEO 基础入口：

`/robots.txt`

`/sitemap.xml`

城市页面：

`/city/<city-name>`

新闻入口：

`/news`

联系/获客入口：

`/contact`

内容工作流保持：

**来源 + 原创解读 + 企业实际价值**

## 不需要做的事情

- 不需要手动改源代码
- 不需要手动运行 npm deploy
- 不需要每次部署重新迁移 D1
- 不需要把管理员密码写进 GitHub
- 不需要为了 SEO 菜单新增大量 D1 表
