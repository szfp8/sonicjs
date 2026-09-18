# 全国财税发票 SEO 网站（szfp8）

基于 **Cloudflare Workers + D1 + R2** 的财税 SEO 生产站。  
后台使用 SonicJS CMS（`@sonicjs-cms/core`），前台为全国城市 SEO 与政策资讯。

**仓库：** https://github.com/szfp8/sonicjs

> **部署方式：在 Cloudflare 控制台连接本 GitHub 仓库，由 Cloudflare 自动构建并部署。**  
> 不需要在本地安装 Node、不需要双击 bat、不需要本机执行 wrangler。  
> **域名绑定：留空，不在本仓库 / 部署流程中配置。**

---

## 从 GitHub 一键部署到 Cloudflare

### 1. 打开 Cloudflare

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Workers**（或已有的 Workers Builds）
3. 选择 **Connect to Git** / **Import a repository**
4. 授权并选择仓库：**`szfp8/sonicjs`**

### 2. 填写构建配置（必须按此填写）

| 配置项 | 填写值 |
|--------|--------|
| **Repository** | `szfp8/sonicjs` |
| **Production branch** | `main` |
| **Root directory** | **`my-sonicjs-app`** |
| **Install command** | `npm install` |
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| **Worker name** | `szfp8-tax-seo`（需与 `wrangler.toml` 中 `name` 一致） |

> Root directory **必须**是 `my-sonicjs-app`，不要用仓库根目录。

### 3. 绑定资源（在 Cloudflare 控制台）

在 Worker 设置中确认：

| 绑定 | 名称 | 资源 |
|------|------|------|
| D1 | `DB` | `szfp8-tax-seo-db` |
| R2 | `MEDIA_BUCKET` | `szfp8-tax-seo-media` |

`my-sonicjs-app/wrangler.toml` 里已写好 D1 ID 与 R2 名称，与控制台保持一致即可。

**域名 / Custom Domain：不配置，留空。** 先用 Cloudflare 分配的 `*.workers.dev` 访问即可。

### 4. 设置 Secrets（必须，不要写进 GitHub）

在 Cloudflare → 该 Worker → **Settings** → **Variables and Secrets** → **Secrets** 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `JWT_SECRET` | 随机长字符串（登录 / CSRF 必需） |
| `BETTER_AUTH_SECRET` | 随机长字符串（会话必需） |
| `INDEXNOW_KEY` | 可选，IndexNow 推送 |

### 5. 公共变量（vars）

已在 `my-sonicjs-app/wrangler.toml` 中配置，也可在控制台覆盖：

- `SITE_NAME` = `全国财税发票服务`
- `SITE_URL` / `BETTER_AUTH_URL` — 可先留空或填 workers.dev 地址，以后再改
- `ENVIRONMENT` = `production`

### 6. 触发部署

- 保存配置后点 **Save and Deploy**，或
- 向 `main` 推送代码，Cloudflare 会自动重新构建部署

部署成功后，在 Cloudflare Worker 概览页查看 **workers.dev** 访问地址。

---

## 首次上线（部署成功后）

1. **D1 迁移**（仅首次或改表结构时）：

   ```bash
   cd my-sonicjs-app
   npx wrangler d1 migrations apply DB --remote
   ```

2. 用 Worker 的 `*.workers.dev` 地址打开 `/auth/register` 注册**第一个**用户  
3. 打开 `/auth/login` 登录 → 进入 `/admin`  
4. 若库中没有任何管理员，系统会自动把最早用户提升为管理员

若日志出现 `JWT_SECRET is not set` 或「无权限」：先在控制台补全 Secrets，再 **Retry deployment**。

---

## 站点入口（相对路径）

| 功能 | 路径 |
|------|------|
| 首页 | `/` |
| 城市 SEO | `/city/北京`、`/city/深圳` … |
| 政策资讯 | `/news` |
| 文章 | `/article/<slug>` |
| 获客 | `/contact` |
| 搜索 | `/search?q=发票` |
| Sitemap / Robots | `/sitemap.xml`、`/robots.txt` |
| 后台 | `/admin` |
| 登录 / 注册 | `/auth/login`、`/auth/register` |

---

## 仓库结构（与 CF 相关）

```
szfp8/sonicjs
└── my-sonicjs-app/          ← Cloudflare Root directory
    ├── src/entrypoint.ts    ← Worker 入口
    ├── src/index.ts
    ├── migrations/
    ├── wrangler.toml        ← 生产配置（无域名 routes）
    └── package.json
```

---

## 注意

- **域名绑定留空**，不在仓库和部署步骤里配置 Custom Domain
- 不要把密码、Secret 写进仓库
- 日常发版只推 `main`；D1 migration 与代码部署分开
- Worker 名称与配置一致：`szfp8-tax-seo`
