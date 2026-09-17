# Cloudflare Production Cleanup Plan

目标：将 szfp8/sonicjs 主分支整理为 Cloudflare 一键部署生产版本。

## 已确认需要处理

- 删除旧部署残留说明文件
- 移除 SonicJS 核心开发仓库的部署误导配置
- 保留 Cloudflare Workers + D1 + R2 生产结构
- 保留财税 SEO 模块
- 保留第一次部署流程

## 部署原则

1. 新 Cloudflare 账户可直接部署
2. 域名由用户部署后自行绑定
3. D1 第一次安装自动执行 migrations
4. 第一次访问 /auth/register 创建管理员
5. 登录后进入 /admin

## 后续检查

- wrangler.toml
- migrations
- auth schema
- SEO routes
- sitemap.xml
- robots.txt
- deploy button
