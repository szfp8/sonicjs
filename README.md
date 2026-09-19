# 全国财税发票 SEO — Cloudflare 一键生产版

仓库：`szfp8/sonicjs`

本仓库按 **Cloudflare Deploy to Cloudflare 自动资源 provision** 设计，**不写死任何自定义域名**：

- `wrangler.toml` 只声明 D1 / R2 / KV 的 **binding 与默认名称**，**不包含**任何账号专属 `database_id` / namespace `id`
- **不需要** Cloudflare API Token
- **不需要** 在 GitHub Actions 里手动 `d1 create` / `r2 bucket create` / `kv namespace create`
- JWT / Better Auth 密钥在首次请求时写入 D1 `app_secrets`，无需在 Dashboard 手工创建 Secret
- `SITE_URL` / `BETTER_AUTH_URL` 在 `wrangler.toml` 中刻意留空；运行时从当前请求自动推导，保证任意自定义域名下「注册成功 → 登录成功」

## 一键部署（全新 Cloudflare 账号 / 已清空环境）

**直接点下面按钮：**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

Cloudflare 会：

1. 连接本仓库（或你的 fork）
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
**不要**在仓库里填写自定义域名。

## 部署后：后台登录步骤

1. 先用 Cloudflare 给出的 `*.workers.dev` 地址打开 `/status`
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
  "migrated": true,
  "auth": {
    "BETTER_AUTH_URL": "https://你的-worker.workers.dev",
    "SITE_URL": "https://你的-worker.workers.dev",
    "requestOrigin": "https://你的-worker.workers.dev",
    "originMatch": true
  }
}
```

3. 打开 `/auth/register` 注册**第一个用户**（会被自动提升为管理员）
4. 打开 `/auth/login` 登录
5. 进入 `/admin`

若 `/status` 里 `DB: false`，说明绑定未成功，请在 Cloudflare Dashboard → Worker → Settings → Bindings 检查是否有 `DB` / `MEDIA_BUCKET` / `CACHE_KV`。

若 `migrated: false`，刷新一次页面（运行时 bootstrap 会建表）；仍失败再看 Worker 日志。

若 `auth.originMatch` 为 `false`，说明当前请求的 origin 与 Better Auth 使用的不一致——请用与浏览器地址栏完全一致的域名访问。

## 自定义域名（只在 Cloudflare 添加，不写进 GitHub）

1. 先完成上面的一键部署，并在 `*.workers.dev` 上完成注册与登录验证
2. 打开 Cloudflare Dashboard → 你的 Worker → **Settings → Domains & Routes / Custom Domains**
3. 添加你的域名（例如你自己的域名）并完成 DNS
4. 之后用**自定义域名**访问 `/status`、注册与登录，确认 `auth.originMatch === true`

仓库代码**不包含**任何具体域名；同一套代码可部署到任意 Cloudflare 账号、绑定任意域名。

## 为什么「注册成功但登录失败」（已修复）

`wrangler.toml` 中 `SITE_URL` / `BETTER_AUTH_URL` 故意留空，以便同一套代码部署到任意 Cloudflare 账号、任意自定义域名。

在 `workers.dev` 下通常无问题；绑定自定义域名后，若 Better Auth 仍使用空 origin，会出现：

- 注册写库成功
- 随后登录时 Session Cookie / Origin 校验失败

**当前 main 已在运行时按请求自动推导 origin**（见 `src/entrypoint.ts` 的 `prepareEnv`），注册与登录使用同一来源，无需把域名写死进仓库。

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
首次请求：bootstrapDatabase + ensureAuthSecrets + 按请求推导 BETTER_AUTH_URL/SITE_URL
        ↓
/status 全绿 → 注册 → 登录后台
        ↓
（可选）在 CF Dashboard 绑定自定义域名
```

## 绑定名称（不要改）

| Binding | 资源 |
|---|---|
| `DB` | D1（database_name = `sonicjs`） |
| `MEDIA_BUCKET` | R2（bucket_name = `sonicjs-media`） |
| `CACHE_KV` | KV |

代码里使用 `env.DB`、`env.MEDIA_BUCKET`、`env.CACHE_KV`，名称必须一致。

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
