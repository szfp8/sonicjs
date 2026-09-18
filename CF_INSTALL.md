# 财税 SEO Cloudflare 一键部署入口

## 当前项目部署目标

本仓库已经针对 Cloudflare Workers + D1 + R2 部署整理。

部署前准备：

1. Cloudflare 添加域名
2. 创建 D1 数据库
3. 创建 R2 Bucket
4. 设置 Worker Secrets（**必须**）

### 必须设置的密钥

在 Cloudflare Worker 的 Secrets 中设置（不要写进代码）：

```bash
wrangler secret put JWT_SECRET
wrangler secret put BETTER_AUTH_SECRET
```

可选：

```bash
wrangler secret put INDEXNOW_KEY
```

> 日志里如果出现 `JWT_SECRET is not set` 或 `CSRF WARNING`，说明密钥未配置，登录/后台权限会异常。

### 公共变量（vars）

- `SITE_URL` — 例如 `https://szfp8.com`
- `SITE_NAME` — 例如 `全国财税发票服务`
- `BETTER_AUTH_URL` — 与 SITE_URL 一致
- `CONTACT_PHONE` — 可留空

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
npm install
```

Build Command:

```
npm run build
```

Deploy Command:

```
npx wrangler deploy
```

## 本地一键部署（Windows 推荐）

根目录双击：

```
START_HERE.bat
```

或命令行：

```bash
node scripts/cloudflare/setup.mjs
```

脚本会：

1. 登录 Cloudflare（如需要）
2. 读取现有 D1
3. **自动写入** `JWT_SECRET` / `BETTER_AUTH_SECRET` / `INDEXNOW_KEY`
4. 部署 Worker 并配置自定义域名

## 部署后：创建管理员

1. 打开 `https://你的域名/auth/register` 注册**第一个**用户
2. 打开 `https://你的域名/auth/login` 登录
3. 进入 `/admin`

系统会在请求时自动检查：若没有任何管理员，则把最早注册的用户提升为 `admin` + `is_super_admin`。

若登录后仍提示无权限：

1. 确认已设置 `JWT_SECRET` 和 `BETTER_AUTH_SECRET`
2. 重新部署一次 Worker
3. 用无痕窗口重新登录

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

- 首次部署建议执行 D1 migrations：`npx wrangler d1 migrations apply DB --remote`（在 `my-sonicjs-app` 目录）
- 管理员密码**不要**写进 GitHub
- 密钥只通过 Cloudflare Secrets 配置
