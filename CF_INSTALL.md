# 全新 Cloudflare：只连接 GitHub 部署

1. Cloudflare → Workers & Pages → Connect to Git
2. 仓库：`szfp8/sonicjs`，分支：`main`
3. **Root directory：`my-sonicjs-app`**
4. Build：`npm run build` · Deploy：`npx wrangler deploy`
5. **域名留空**
6. Save and Deploy

部署后在控制台给 Worker 加 Bindings：

- D1 → `DB`
- R2 → `MEDIA_BUCKET`

Secrets：`JWT_SECRET`、`BETTER_AUTH_SECRET`

用 `*.workers.dev` 打开 `/auth/register` 注册管理员。
