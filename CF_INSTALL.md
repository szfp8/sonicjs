# 从 GitHub 部署到 Cloudflare（推荐）

**不在本地部署。** 在 Cloudflare 控制台连接本仓库，由 CF 自动构建部署。

**域名绑定：留空，不配置 Custom Domain。**

## 控制台配置

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → 连接 Git
2. 仓库：`https://github.com/szfp8/sonicjs`
3. 分支：`main`
4. **Root directory：`my-sonicjs-app`**
5. Install：`npm install`
6. Build：`npm run build`
7. Deploy：`npx wrangler deploy`
8. Worker 名：`szfp8-tax-seo`

## Secrets（控制台 Variables and Secrets）

必须：

- `JWT_SECRET`
- `BETTER_AUTH_SECRET`

可选：`INDEXNOW_KEY`

## 绑定

- D1 → `DB` → `szfp8-tax-seo-db`
- R2 → `MEDIA_BUCKET` → `szfp8-tax-seo-media`
- **域名 / Custom Domain → 不填，留空**（用 workers.dev 即可）

## 部署后

1. 首次需要时执行 D1 migration（远程一次即可）
2. 用 workers.dev 地址打开 `/auth/register` 注册第一个用户
3. `/auth/login` → `/admin`

详见根目录 [README.md](./README.md)。
