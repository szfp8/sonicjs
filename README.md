# 全国财税发票 SEO

Cloudflare Workers + D1 + R2 + KV。**连接 GitHub 即可部署。**

仓库：https://github.com/szfp8/sonicjs

不绑定自定义域名，使用 `*.workers.dev`。

---

## 已经连上 Cloudflare 时

当前 Worker 名称是 **`sonicjs`**。把代码推送到 `main` 就会自动重新部署。

不要改 Root directory（仓库根目录）。域名留空。

| Cloudflare 构建设置 | 值 |
|---|---|
| 分支 | `main` |
| Root directory | **留空** |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |
| 域名 | **留空** |

`npm run build` 会在 Cloudflare 上自动：

1. 创建 D1 数据库 `sonicjs`（后台 / 登录用）
2. 创建 R2 存储桶 `sonicjs-media`（媒体）
3. 创建 KV `CACHE_KV`（缓存和密钥兜底）
4. 执行数据库迁移
5. 写入 `JWT_SECRET` / `BETTER_AUTH_SECRET`（没有才写，不会每次覆盖）

然后 `npx wrangler deploy` 把 Worker 发布出去。

---

## 全新 Cloudflare 账号第一次连接

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. **Create** → **Connect to Git** → 选择 **`szfp8/sonicjs`**
3. Worker 名称填 **`sonicjs`**
4. Root directory **留空**
5. 构建命令 `npm run build`，部署命令 `npx wrangler deploy`
6. 域名留空
7. Save and Deploy

部署成功后打开：

- 前台：`https://sonicjs.<你的子域>.workers.dev/`
- 状态：`/status`
- 注册管理员：`/auth/register`
- 登录：`/auth/login`
- 后台：`/admin`

---

## 常用路径

`/` · `/city/北京` · `/news` · `/admin` · `/auth/login` · `/status`
