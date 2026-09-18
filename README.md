# 全国财税发票 SEO — Cloudflare 一键生产版

仓库：`szfp8/sonicjs`

这个版本按 **Cloudflare 官方 Deploy to Cloudflare 自动资源 provision** 方式设计：
GitHub 仓库里的 Wrangler 配置只声明 D1 / R2 / KV 的绑定和默认名称，不在 GitHub Actions/Workers Builds 里自行执行 `d1 create`、`r2 bucket create`、`kv namespace create`，也不要求你提供 Cloudflare API Token。Cloudflare 会在部署过程中自动创建所需资源并绑定 Worker。citeturn0search1turn1search2

## 一键部署

**直接点下面这个按钮：**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

Cloudflare 会：
1. 把仓库复制到你的 GitHub；
2. 根据 `wrangler.toml` 自动创建 D1、R2、KV；
3. 创建/配置 Worker；
4. 使用仓库中的 `npm run deploy` 完成 Worker 发布和 D1 migrations；
5. 建立 Workers Builds，之后 GitHub 推送可以自动部署。citeturn0search1turn0search4

### Cloudflare 部署页的设置

| 项目 | 设置 |
|---|---|
| Root directory | 留空 |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Worker name | `sonicjs` 或 Cloudflare 页面允许的名称 |
| Production branch | `main` |

**不要**再手动填写 D1 ID、KV ID、R2 bucket ID，也不要在 Build 中运行 `npm run cf:setup`。

## 为什么这次改掉原来的部署脚本

原版本在 `npm run deploy` 里自己调用 `wrangler d1 create`、`wrangler r2 bucket create`、`wrangler kv namespace create`。这依赖 Cloudflare API 凭据；而 Cloudflare 的 Deploy to Cloudflare 已经原生支持自动 provision 这些资源，因此重复创建会导致资源未绑定、配置文件不一致以及后续后台登录异常。

现在的 `scripts/cf-deploy.mjs` 只做两件事：

```text
Cloudflare 自动 provision 资源
        ↓
wrangler deploy
        ↓
wrangler d1 migrations apply DB --remote --yes
        ↓
Worker / D1 正常运行
```

D1 的 binding 必须最终有数据库 ID，但 Deploy to Cloudflare 会负责 provision；Cloudflare 文档也明确说明可以通过部署流程自动创建 D1/KV/R2。citeturn1search2turn0search1

## 后台登录

部署完成后依次打开：

- `/status`
- `/auth/register`
- `/auth/login`
- `/admin`

第一次注册的用户会由站点启动逻辑提升为管理员；之后再登录后台。

如果 `/status` 返回：
- `DB: true`
- `migrated: true`
- `JWT_SECRET: true`
- `BETTER_AUTH_SECRET: true`

再进入 `/admin`。

JWT / Better Auth 密钥不写进 Git。应用启动时会在 D1 的 `app_secrets` 中生成并保存稳定密钥；这样一键部署不需要用户手工创建 Secret。

## 绑定

固定绑定名：

- `DB` → D1
- `MEDIA_BUCKET` → R2
- `CACHE_KV` → KV

这些名称不要改，否则应用代码中的 `env.DB`、`env.MEDIA_BUCKET`、`env.CACHE_KV` 无法对应。

## 域名

**不要把 `szfp8.com` 写死在 GitHub。**

先让一键部署完成 Worker、D1、R2、KV 和后台登录，再在 Cloudflare 给 Worker 添加 `szfp8.com` Custom Domain。这样同一套 GitHub 代码也可以部署到其他 Cloudflare 账号。

## 更新

以后只需要：

```text
GitHub push main
      ↓
Cloudflare Workers Builds
      ↓
npm run build
      ↓
npm run deploy
      ↓
Worker 更新 + D1 migrations
```

D1 migrations 可以重复执行；Wrangler 会跳过已经应用的迁移。

## 本地开发

```bash
npm install
npm run type-check
```

生产部署不要把 Cloudflare API Token 放进仓库。
