# 财税SEO Cloudflare 一键部署说明

## 部署目标

本仓库用于部署 Cloudflare Workers + D1 + R2 的财税 SEO 网站。

## 第一次安装流程

1. 连接 GitHub 仓库到 Cloudflare Workers
2. 使用 main 分支
3. 构建完成后设置环境变量

必须设置：

- BETTER_AUTH_SECRET
- JWT_SECRET
- SITE_URL
- SITE_NAME

## 域名

域名不写入代码，由用户在 Cloudflare 控制台绑定。

## 服务模块规划

- SEO 首页
- 城市 SEO 页面
- Sitemap
- Robots
- 内容发布
- 微信文章入口
- 多语言设置
- 获客留言管理
- 支付接口扩展
