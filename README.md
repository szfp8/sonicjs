# 全国财税发票 SEO

基于 SonicJS 的 Cloudflare Workers 站点（D1 + R2 + KV）。

仓库：https://github.com/szfp8/sonicjs  
Worker 名称：`sonicjs`  
入口：`src/entrypoint.ts`

---

## 一、清空 Cloudflare 后重新部署

### 1. 清空（可选，彻底重来）

在 [Cloudflare Dashboard](https://dash.cloudflare.com/)：

1. **Workers & Pages** → 删除 Worker **`sonicjs`**（若存在）
2. **D1** → 删除数据库 **`sonicjs`**（若存在）
3. **R2** → 删除桶 **`sonicjs-media`**（若存在，可选）
4. **KV** → 删除与本项目相关的命名空间（可选）

> 只想更新代码、不丢数据：不要删 D1，直接重新 Deploy 即可。

### 2. 重新连接 GitHub 部署

1. **Workers & Pages** → **Create** → **Connect to Git**
2. 选择仓库 **`szfp8/sonicjs`**，分支 **`main`**
3. 填写：

| 项 | 值 |
|----|-----|
| Root directory | **留空** |
| 构建命令 | `npm run build` |
| **部署命令** | **`npm run deploy`** |
| Worker 名称 | `sonicjs` |
| Custom Domain | **留空**（先用 workers.dev） |

4. Save and Deploy，等待成功
5. 在 Worker 详情页复制 **`*.workers.dev`** 地址，下文记为 `https://你的域名`

### 3. 部署后自检

打开：`https://你的域名/status`

期望：`ok: true`，`DB: true`，`migrated: true`，`JWT_SECRET: true`。

---

## 二、前台链接（公开，无需登录）

把 `https://你的域名` 换成实际 workers.dev 地址。

| 功能 | 链接 | 说明 |
|------|------|------|
| 首页 | `/` | 城市入口 + 政策 + 微信文章入口 |
| 政策解读列表 | `/news` | 读已发布的「政策解读 / SEO资讯」 |
| 政策文章详情 | `/article/{slug}` | 例如 `/article/my-slug` |
| 微信文章列表 | `/wechat` | 读已发布的「微信文章」 |
| 微信文章详情 | `/wechat/{slug}` | 可跳转微信原文链接 |
| 城市落地页 | `/city/{城市名}` | 例：`/city/北京`、`/city/上海` |
| 提交咨询 | `/contact` | 表单；也可 `/contact?city=北京` |
| 提交咨询接口 | `POST /api/lead` | 表单提交目标 |
| 站内搜索 | `/search` | `/search?q=关键词` |
| 多语言 | `?lang=zh` / `en` / `ja` / `ko`… | 例：`/?lang=en` |
| Sitemap | `/sitemap.xml` | 含首页、新闻、微信、城市页 |
| Robots | `/robots.txt` | 禁止爬 /admin、/api/ |
| 健康检查 | `/status` 或 `/health` | JSON 绑定与迁移状态 |

**IndexNow（可选）**：配置 Secret `INDEXNOW_KEY` 后，验证地址为：

`https://你的域名/{INDEXNOW_KEY}.txt`

---

## 三、后台链接（需登录）

| 功能 | 链接 | 说明 |
|------|------|------|
| **注册（首次）** | `/auth/register` | 第一个用户会成为管理员 |
| **登录** | `/auth/login` | 登录后进入后台 |
| **管理后台首页** | `/admin` | 内容 / 用户 / 设置 |
| 内容集合 | `/admin` → 内容集合 | 见下方集合表 |
| 媒体库 | 后台「媒体」菜单 | 依赖 R2 `MEDIA_BUCKET` |
| 用户 | 后台「用户」菜单 | |
| 设置 | 后台「设置」菜单 | |
| 插件 | 后台「插件」菜单 | redirect / GraphQL / MCP / versioning |
| GraphQL | `/graphql`（需插件启用） | 浏览器可开 GraphiQL |

### 推荐首次流程

1. `https://你的域名/status` → 确认 `ok: true`
2. `https://你的域名/auth/register` → 注册管理员
3. `https://你的域名/auth/login` → 登录
4. `https://你的域名/admin` → 管理内容

---

## 四、后台内容集合 ↔ 前台展示

| 后台集合显示名 | 集合 name | 前台入口 |
|----------------|-----------|----------|
| 网站资讯 | `blog_post` | 主要走 CMS API；前台 SEO 页以政策/微信为主 |
| 政策解读 / SEO资讯 | `seo_article` | `/news`、`/article/{slug}` |
| SEO城市页面 | `seo_city_page` | 可配合 `/city/{城市}` 使用 |
| **微信文章** | `wechat_article` | `/wechat`、`/wechat/{slug}` |
| 网站设置 | `site_settings` | SEO/获客设置 API |

发布内容后：在后台把状态设为 **Published（已发布）**，前台才会显示。

---

## 五、代码结构（检查摘要）

| 路径 | 作用 |
|------|------|
| `src/entrypoint.ts` | Worker 入口：bootstrap、/status、前台增强路由 |
| `src/index.ts` | SonicJS 应用 + 前台 SEO 回退 + 后台中文 |
| `src/seo/public.ts` | 首页、城市、咨询、robots |
| `src/seo/enhanced.ts` | /news、/wechat、/article、/search、完整 sitemap |
| `src/collections/*` | 内容模型 |
| `src/i18n/*` | 多语言 |
| `scripts/cf-deploy.mjs` | 部署：wrangler deploy + 迁移 + Secrets |
| `wrangler.toml` | name=`sonicjs`，main=`src/entrypoint.ts` |

当前 `main` 已包含：微信文章栏目、多语言、前台异常容错。

---

## 六、常见问题

| 问题 | 处理 |
|------|------|
| 前台打不开 | 先看 `/status`；确认部署命令是 `npm run deploy` |
| 后台打不开 / 不能登录 | 先 `/auth/register`；确认 `DB`、`JWT_SECRET` |
| 前台无文章 | 后台发布对应集合，状态为已发布 |
| Error 1101 | 看 Worker Logs；新版本会尽量返回可读错误页 |
| INDEXNOW_KEY | 可选；不填不影响前台后台 |
