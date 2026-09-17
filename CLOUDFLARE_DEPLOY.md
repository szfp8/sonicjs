# Cloudflare 一键部署说明（财税 SEO 版本）

## 部署入口

使用 Cloudflare Deploy Button：

https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs

## 第一次安装流程

1. 部署 Worker
2. 配置 D1 数据库绑定（名称由部署环境填写）
3. 配置 R2 媒体存储
4. 设置 BETTER_AUTH_SECRET 和 JWT_SECRET
5. 绑定自己的域名
6. 打开 `/auth/register` 创建第一个管理员
7. 登录 `/admin`

## 部署检查

检查：

- Worker 是否正常启动
- D1 migration 是否完成
- R2 是否绑定
- Better Auth 环境变量是否存在

域名不写入仓库，由用户自行绑定。
