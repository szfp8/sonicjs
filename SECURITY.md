# 安全说明（sonicjs 一键 CF 版）

## 部署模型（无硬编码资源 ID）

- `wrangler.toml` **只声明 binding**：`DB` / `MEDIA_BUCKET` / `CACHE_KV`
- **不写** `database_id`、KV namespace id、账号专属 ID
- Cloudflare Deploy to Cloudflare / Workers Builds 自动 provision 并绑定
- 线上地址形态：`https://sonicjs.<账号子域>.workers.dev`（子域由 CF 账号生成，非仓库硬编码）

## 已做防护

| 项 | 做法 |
|----|------|
| XSS | 前台 HTML 统一 `esc()` 转义用户/库内容 |
| 点击劫持 | `X-Frame-Options: SAMEORIGIN` |
| MIME 嗅探 | `X-Content-Type-Options: nosniff` |
| CSP 基线 | `base-uri 'self'; object-src 'none'; frame-ancestors 'self'` |
| 线索刷接口 | 有 KV 时按 IP 约 8 次/分钟限流 |
| 错误信息 | 生产错误页不输出完整 stack |
| 认证 | Better Auth；首用户升管理员；去掉有问题的 organization 插件映射 |
| 密钥 | JWT / BETTER_AUTH_SECRET 运行时写入 D1 `app_secrets`，不进 Git |
| 后台 API | 设置类路由走 SonicJS `adminSettingsRoutes`（需登录会话） |
| 公开写接口 | 仅 `POST /api/lead`（字段长度截断 + 限流） |

## 运营注意

1. **不要**把 Cloudflare API Token、真实 JWT 写进仓库
2. 自定义域名在 Dashboard 绑定，不要写死在代码里
3. `/status` 仅返回绑定布尔值，不含密钥明文
4. 文章「发布」后才会在前台出现（`is_published = 1`）
5. AI关键词 / GEO 仅影响 meta 与 JSON-LD，不替代人工审核内容合规

## 已知边界

- CMS 后台依赖 SonicJS 内联脚本，CSP 未使用 `script-src 'nonce-...'`（过严会导致后台不可用）
- `CORS_ORIGINS=*` 面向公开 SEO 站；若仅内网管理可改为具体域名
- 无 KV 绑定时线索限流自动跳过
