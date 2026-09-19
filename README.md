# 全国财税发票 SEO — Cloudflare 一键生产版

仓库：`szfp8/sonicjs`

本仓库按 **Cloudflare Deploy to Cloudflare 自动资源 provision** 设计：

- `wrangler.toml` 只声明 D1 / R2 / KV 的 **binding 与默认名称**，**不包含**任何账号专属 `database_id` / namespace `id`
- **不需要** Cloudflare API Token
- **不需要** 在 GitHub Actions 里手动 `d1 create` / `r2 bucket create` / `kv namespace create`
- JWT / Better Auth 密钥在首次请求时写入 D1 `app_secrets`，无需在 Dashboard 手工创建 Secret

## 一键部署

**直接点下面按钮：**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

Cloudflare 会：

1. 把仓库复制到你的 GitHub（或使用已有 fork）
2. 根据 `wrangler.toml` **自动创建并绑定** D1、R2、KV
3. 创建 Worker
4. 执行 `npm run build` → `npm run deploy`（发布 Worker + 尝试 D1 migrations）
5. 之后 push `main` 可通过 Workers Builds 自动更新

### Cloudflare 部署页推荐设置

| 项目 | 设置 |
|---|---|
| Root directory | 留空 |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Worker name | `sonicjs`（或页面允许的名称） |
| Production branch | `main` |

**不要**再手动填写 D1 ID、KV ID、R2 bucket ID。  
**不要**再运行旧版「自己 create 资源」的脚本。

## 部署后：后台登录步骤

1. 打开 `https://你的worker.workers.dev/status`
2. 确认返回类似：

```json
{
  "ok": true,
  "bindings": {
    "DB": true,
    "MEDIA_BUCKET": true,
    "CACHE_KV": true,
    "JWT_SECRET": true,
    "BETTER_AUTH_SECRET": true
  },
  "migrated": true
}
```

3. 打开 `/auth/register` 注册**第一个用户**（会被提升为管理员）
4. 打开 `/auth/login` 登录
5. 进入 `/admin`

若 `/status` 里 `DB: false`，说明绑定未成功，请在 Cloudflare Dashboard → Worker → Settings → Bindings 检查是否有 `DB` / `MEDIA_BUCKET` / `CACHE_KV`。

若 `migrated: false`，刷新一次页面（运行时 bootstrap 会建表）；仍失败再看 Worker 日志。

## 为什么不再用「脚本自己 create 资源」

旧方案在 `npm run deploy` 里调用 `wrangler d1 create` 等，依赖 API Token，且容易与 Deploy to Cloudflare 的自动 provision 冲突，导致：

- 资源建了但未绑定到 Worker
- `wrangler.toml` 与实际 ID 不一致
- 后台登录 500（缺表 / 缺密钥）

当前流程：

```text
Deploy to Cloudflare 自动 provision D1/R2/KV
        ↓
wrangler deploy（发布 Worker）
        ↓
尝试 wrangler d1 migrations apply（失败不阻断）
        ↓
首次请求：bootstrapDatabase + ensureAuthSecrets
        ↓
/status 全绿 → 注册 → 登录后台
```

## 绑定名称（不要改）

| Binding | 资源 |
|---|---|
| `DB` | D1（database_name = `sonicjs`） |
| `MEDIA_BUCKET` | R2（bucket_name = `sonicjs-media`） |
| `CACHE_KV` | KV |

代码里使用 `env.DB`、`env.MEDIA_BUCKET`、`env.CACHE_KV`，名称必须一致。

## 域名

**不要把自定义域名写死在 GitHub。**

先完成一键部署与后台登录，再在 Cloudflare Dashboard 给 Worker 添加 Custom Domain（例如 `szfp8.com`）。同一套代码可部署到任意 Cloudflare 账号。

## 日常更新

```text
git push origin main
      ↓
Cloudflare Workers Builds
      ↓
npm run build && npm run deploy
      ↓
Worker 更新 +（尽量）D1 migrations
```

D1 migrations 可重复执行；已应用的会被跳过。运行时 bootstrap 对「已存在表/列」也是幂等的。

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars   # 可选，本地密钥
npm run type-check
npx wrangler dev
```

生产一键部署**不要**把 Cloudflare API Token 或真实 Secret 写进仓库。
