# my-sonicjs-app（生产应用）

全国财税发票 SEO 站点的 Cloudflare Workers 应用目录。

## 快速部署

仓库根目录双击 `START_HERE.bat`，或：

```bash
# 在仓库根目录
node scripts/cloudflare/setup.mjs
```

Cloudflare Workers Builds 请将 **Root directory** 设为 `my-sonicjs-app`。

## 必须密钥

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put BETTER_AUTH_SECRET
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run build` | Workers 构建占位（由 Wrangler 打包） |
| `npm run deploy` | `wrangler deploy` |
| `npm run db:migrate:remote` | 远程 D1 迁移 |

## 入口

- Worker：`src/entrypoint.ts`
- 应用逻辑：`src/index.ts`
- 配置：`wrangler.toml`

详见仓库根目录 [README.md](../README.md)。
