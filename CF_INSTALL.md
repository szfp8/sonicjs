# 财税 SEO Cloudflare 一键部署入口

## 当前项目部署目标

本仓库已经针对 Cloudflare Workers + D1 + R2 部署整理。

部署前准备：

1. Cloudflare 添加域名
2. 创建 D1 数据库
3. 创建 R2 Bucket
4. 设置 Worker Secrets

需要设置：

- `JWT_SECRET`
- `BETTER_AUTH_SECRET`

## Cloudflare Workers Builds

Git Repository:

```
https://github.com/szfp8/sonicjs
```

Production Branch:

```
main
```

Root Directory:

```
my-sonicjs-app
```

Install Command:

```
pnpm install
```

Build Command:

```
npm run build
```

Deploy Command:

```
npx wrangler deploy
```

## 本地一键部署

Windows / Mac / Linux:

```bash
cd my-sonicjs-app
pnpm install
npx wrangler deploy
```

## 部署后检查

首页：

```
/
```

后台：

```
/admin
```

SEO 页面：

```
/robots.txt
/sitemap.xml
/city/北京
/news
```

## 注意

首次部署必须先完成 SonicJS 初始化和数据库迁移，然后创建第一个管理员账户。
