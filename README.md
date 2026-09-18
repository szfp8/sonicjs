# 全国财税发票 SEO

基于 **SonicJS**（`@sonicjs-cms/core`）+ Cloudflare Workers。

仓库：https://github.com/szfp8/sonicjs

---

## 1. D1 / R2 / KV 与 SonicJS 的对应关系

这些资源是 **SonicJS 框架要求的绑定**，不是本站随意命名。`wrangler.toml` 与官方一致：

| Cloudflare 资源 | 绑定名（代码里 `env.xxx`） | 官方用途 | 本站用途 |
|-----------------|---------------------------|----------|----------|
| **D1** | `DB` | 用户、会话、内容文档、插件状态 | 注册登录、文章、城市页、首页设置 |
| **R2** | `MEDIA_BUCKET` | 媒体上传存储 | 后台媒体库图片/文件 |
| **KV** | `CACHE_KV` | 边缘缓存 | 加速内容读取 |

部署脚本 `npm run deploy` 会在**当前 CF 账号新建**（或复用同名）：

- D1 库名：`sonicjs`
- R2 桶名：`sonicjs-media`（变量 `BUCKET_NAME` 同名）
- KV 标题：`CACHE_KV`

> 绑定名 `DB` / `MEDIA_BUCKET` / `CACHE_KV` **不能改**，否则 SonicJS 后台与上传会失效。

---

## 2. 空白 CF 一键部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

或 Connect to Git → `szfp8/sonicjs` / `main`：

| 项 | 值 |
|----|-----|
| Root directory | **留空** |
| Build command | `npm run build` |
| **Deploy command** | **`npm run deploy`** |
| Worker name | `sonicjs` |
| Custom domain | **留空** |

自动流程：新建 D1+R2+KV → 发布 Worker → 空库建表 → 写入 `JWT_SECRET` / `BETTER_AUTH_SECRET`。

部署后：`/status` → `/auth/register` → `/auth/login` → `/admin`。

---

## 3. 后台可以改前台什么

登录 `/admin` 后，**无需改代码**即可管理前台展示内容：

| 前台效果 | 后台入口 |
|----------|----------|
| 首页标题、介绍、导航文案、模块开关 | **网站设置** → `/admin/settings/general`（首页设置表单） |
| 政策解读列表/详情 | 内容 → **政策解读 / SEO资讯** → 发布 |
| 微信文章列表/详情 | 内容 → **微信文章** → 发布 |
| 城市页自定义正文 | 内容 → **SEO城市页面**（城市名与 `/city/北京` 一致）→ 发布 |
| 普通资讯 | 内容 → **网站资讯** |
| 图片/附件 | **媒体**（写入 R2 `MEDIA_BUCKET`） |
| SEO 标题/关键词、获客电话微信 | 网站设置 → SEO / 获客面板 |

前台路由：`/`、`/news`、`/wechat`、`/city/{城市}`、`/contact`、`/search`。

> 页面**布局/模板代码**仍在仓库 `src/seo/*`；改布局需改代码并重新部署。文案与文章内容全部可在后台改。

---

## 4. 部署与更新

| 场景 | 做法 |
|------|------|
| 首次空白 CF | 一键 Deploy / Connect Git + `npm run deploy` |
| 更新代码 | 推送 `main`，CF 自动再部署 |
| 只改文章/首页文案 | 后台发布即可，**不必**重新部署 |
| 改模板/样式 | 改 GitHub 代码后重新部署 |

---

## 5. 密钥

`JWT_SECRET`、`BETTER_AUTH_SECRET`：仅 Cloudflare **Secret**，或由部署脚本自动生成。不要写进 `wrangler.toml` / Git。
