# 财税 SEO 生产应用（my-sonicjs-app）

Cloudflare Workers 实际部署目录。根目录请看仓库 [README.md](../README.md) 一键部署说明。

## 快速命令

```bash
npm install
npx wrangler d1 migrations apply DB --local   # 本地库
npx wrangler dev
npx wrangler deploy                           # 生产（不自动跑远程 migration）
npx wrangler d1 migrations apply DB --remote  # 仅在需要改表结构时
```

## 必须密钥（Secrets）

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put BETTER_AUTH_SECRET
# 可选
npx wrangler secret put INDEXNOW_KEY
```

## 入口

- Worker 入口：`src/entrypoint.ts`
- CMS + SEO：`src/index.ts`
- 城市/文章/搜索等：`src/seo/`
- 内容模型：`src/collections/`

## 配置

见 `wrangler.toml`（D1 / R2 / SITE_URL 等）。本地生成的 `wrangler.production.toml` 勿提交。
