# 财税SEO Cloudflare 生产部署检查清单

## 目标

本仓库用于部署到 Cloudflare Workers。

部署前检查：

- [ ] wrangler.toml 中 Worker 名称正确
- [ ] D1 数据库绑定 DB
- [ ] R2 媒体桶绑定 MEDIA_BUCKET
- [ ] BETTER_AUTH_SECRET 已设置
- [ ] JWT_SECRET 已设置
- [ ] SITE_URL 使用自己的域名

## 一键部署

Cloudflare Deploy Button:

https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs

## 首次安装流程

1. 连接 GitHub main 分支
2. 设置 Cloudflare Variables
3. 部署 Worker
4. 执行数据库迁移
5. 打开 /auth/register 创建第一个管理员
6. 登录 /admin

## SEO模块计划

- 城市SEO页面
- sitemap.xml
- robots.txt
- 多语言系统
- 微信文章发布
- 获客留言管理
- 支付接口扩展
