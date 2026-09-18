# 全国财税发票 SEO（SonicJS + Cloudflare）

仓库：https://github.com/szfp8/sonicjs

---

## 空白 Cloudflare 一键部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

或：**Workers & Pages → Create → Connect to Git** → `szfp8/sonicjs` / 分支 `main`：

| 项 | 值 |
|----|-----|
| Root directory | **留空** |
| Build command | `npm run build` |
| **Deploy command** | **`npm run deploy`**（必须） |
| Worker name | `sonicjs` |
| Custom domain | **留空** |

### 部署时自动完成（全新账号）

`npm run deploy`（`scripts/cf-deploy.mjs`）会：

1. **新建** D1 数据库 `sonicjs`（SonicJS 标准绑定名 `DB`）
2. **新建** R2 桶 `sonicjs-media`（绑定 `MEDIA_BUCKET`）
3. **新建** KV `CACHE_KV`（绑定 `CACHE_KV`）
4. 发布 Worker 并绑定以上资源
5. 对空 D1 **建表**（auth / 内容表，不是搬旧数据）
6. 写入 Secret：`JWT_SECRET`、`BETTER_AUTH_SECRET`、`INDEXNOW_KEY`（已有则跳过）

密钥**不要**写进 `wrangler.toml`。

---

## 部署后

1. 打开 `https://你的域名/status`  
   期望：`ok: true`，`DB` / `migrated` / `JWT_SECRET` 均为 true
2. **注册**：`/auth/register`（First Name / Last Name / Email / Password）
3. **登录**：`/auth/login` → `/admin`
4. 前台：`/`

### 登录注册说明

- 已禁用 Better Auth **organization** 多租户插件（本站不需要），避免 `tenant_id` / `tenantId` schema 校验拦截登录。
- 第一个注册用户会被提升为管理员（`role=admin` + `is_super_admin=1`）。

---

## 前台 / 后台路径

| 前台 | 路径 | 后台 | 路径 |
|------|------|------|------|
| 首页 | `/` | 注册 | `/auth/register` |
| 政策 | `/news` | 登录 | `/auth/login` |
| 微信 | `/wechat` | 后台 | `/admin` |
| 城市 | `/city/北京` | 首页设置 | `/admin/settings/general` |
| 咨询 | `/contact` | 城市正文 | `/admin/content?model=seo_city_page` |
| 状态 | `/status` | 微信文章 | `/admin/content?model=wechat_article` |
