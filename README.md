# 全国财税发票 SEO

Cloudflare Workers + **新建** D1 / R2 / KV（基于 SonicJS）。

仓库：https://github.com/szfp8/sonicjs

---

## 一键部署（清空 CF 后推荐）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

或：**Workers & Pages → Create → Connect to Git** → 选 `szfp8/sonicjs` → 分支 `main`：

| 项 | 值 |
|----|-----|
| Root directory | **留空** |
| Build command | `npm run build` |
| **Deploy command** | **`npm run deploy`** |
| Worker name | `sonicjs` |
| Custom domain | **留空** |

### 部署时自动做什么（不是搬旧数据）

`npm run deploy` 会在**当前 Cloudflare 账号**里：

1. **新建** D1 数据库 `sonicjs`（已有同名则复用）  
2. **新建** R2 桶 `sonicjs-media`  
3. **新建** KV `CACHE_KV`  
4. 发布 Worker 并绑定以上资源  
5. 对**空的 D1** 执行建表 SQL（创建用户表、内容表等）  
6. 写入 `JWT_SECRET` / `BETTER_AUTH_SECRET` 等 Secret  

> 说明：命令里的 *migrations* 只表示「空库建表脚本」，**不是**从旧站点迁移数据。你清空 CF 后就是全新资源。

### 部署后

1. 打开 `https://你的域名/status` → `ok` / `DB` / `migrated` / `JWT_SECRET` 应为 true  
2. `/auth/register` 注册第一个管理员  
3. `/auth/login` → `/admin`  
4. 前台：`/`  

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
