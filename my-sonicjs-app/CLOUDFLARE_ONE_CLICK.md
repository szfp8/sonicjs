# Cloudflare 一键部署版

这个目录现在可以作为独立的 Cloudflare Workers 应用部署。

## 设计目标

- 不要求本地 Windows 电脑安装 Node.js 或 Wrangler
- Cloudflare 自动创建并绑定 D1
- Cloudflare 自动创建并绑定 R2
- 部署时自动执行 `migrations/` 中的 D1 迁移
- 不在仓库中保存管理员密码
- 默认站点地址：`https://szfp8.com`
- Worker 默认名称：`szfp8-tax-seo`

## 为什么需要 D1 和 R2

### D1：需要

D1 用于保存 SonicJS 后台、内容、登录会话以及 SEO 获客表等数据库数据。

### R2：需要

R2 用于 SonicJS 后台媒体/文件存储。公开 SEO 首页本身不依赖 R2，但保留 R2 绑定可以让后台媒体功能完整工作。

### KV：当前不需要

本版本不强制创建 KV。先保持资源最少，降低部署失败概率；以后确实需要缓存时再增加。

## Cloudflare Deploy to Cloudflare

Cloudflare 的 Deploy to Cloudflare 可以根据 `wrangler.toml` 自动识别 D1、R2 等资源并在部署时创建和绑定，同时可以执行 `package.json` 中的自定义 deploy 脚本。

由于 Cloudflare 的 Deploy to Cloudflare 按钮要求源 Git 仓库公开，而且这个仓库当前可能是私有仓库，因此需要先解决仓库可见性问题，或者使用 Cloudflare Workers 的 Git Integration 连接私有仓库。

## 重要

如果通过 Deploy to Cloudflare 指向本目录，请把本目录作为应用根目录；本目录已经不再依赖上级 `packages/core`，而是直接使用公开发布的 `@sonicjs-cms/core` npm 包。

## 部署完成后

1. 检查 Worker 是否成功上线。
2. 检查 D1 是否出现 `szfp8-tax-seo-db`。
3. 检查 R2 是否出现 `szfp8-tax-seo-media`。
4. 将 `szfp8.com` 绑定到 Worker。
5. 打开首页、`/robots.txt`、`/sitemap.xml`、`/news` 和 `/admin`。
6. 第一次进入后台时由你自己完成管理员账户设置；仓库不保存固定管理员密码。
