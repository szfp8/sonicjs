# 全国财税发票 SEO 网站（szfp8）

基于 Cloudflare Workers + D1 + R2 的财税 SEO 生产站。  
后台使用 SonicJS CMS（`@sonicjs-cms/core`），前台为全国城市 SEO 与政策资讯站。

**线上域名：** https://szfp8.com  
**仓库：** https://github.com/szfp8/sonicjs

---

## 一键部署（Windows）

1. 安装 [Node.js 20+](https://nodejs.org/)
2. 克隆本仓库到本地
3. **双击根目录 `START_HERE.bat`**

脚本会自动：

- 检查 Node.js
- 登录 Cloudflare（如未登录会打开浏览器）
- 读取你已有的 D1
- 写入密钥：`JWT_SECRET` / `BETTER_AUTH_SECRET` / `INDEXNOW_KEY`
- 部署 Worker 并配置自定义域名

也可在仓库根目录执行：

```bash
node scripts/cloudflare/setup.mjs
```

---

## Cloudflare Workers Builds（Git 连接）

| 项 | 值 |
|---|---|
| Repository | `szfp8/sonicjs` |
| Branch | `main` |
| **Root directory** | **`my-sonicjs-app`** |
| Install | `npm install` |
| Build | `npm run build` |
| Deploy | `npx wrangler deploy` |
| Worker 名称 | `szfp8-tax-seo` |

部署后请在 Cloudflare 控制台设置 Secrets（不要写进 GitHub）：

```bash
wrangler secret put JWT_SECRET
wrangler secret put BETTER_AUTH_SECRET
```

公共变量（`wrangler.toml` 中已有示例）：

- `SITE_URL` = `https://szfp8.com`
- `SITE_NAME` = `全国财税发票服务`
- `BETTER_AUTH_URL` = 与 SITE_URL 一致

---

## 首次上线检查清单

1. D1 绑定 `DB`，R2 绑定 `MEDIA_BUCKET`
2. 执行一次远程迁移（仅首次或 schema 变更时）：

```bash
cd my-sonicjs-app
npx wrangler d1 migrations apply DB --remote
```

3. 打开 https://szfp8.com/auth/register 注册**第一个**用户  
4. 登录 https://szfp8.com/auth/login → 进入 `/admin`  
5. 系统会在无管理员时自动把最早用户提升为管理员

若日志出现 `JWT_SECRET is not set` 或登录无权限，先配置上面两个 Secret 再重新部署。

---

## 站点能力

| 功能 | 路径 |
|------|------|
| 首页 | `/` |
| 城市 SEO（314 城） | `/city/北京`、`/city/深圳` … |
| 政策资讯 | `/news` |
| 文章 | `/article/<slug>` |
| 获客表单 | `/contact` |
| 站内搜索 | `/search?q=发票` |
| Sitemap / Robots | `/sitemap.xml`、`/robots.txt` |
| 后台 | `/admin` |
| 登录 / 注册 | `/auth/login`、`/auth/register` |

内容类型（后台可维护）：

- SEO 城市页面
- SEO 政策解读 / 文章（来源 + 原创解读 + 企业实际价值）
- 博客等 SonicJS 集合

---

## 目录说明（生产结构）

```
szfp8/sonicjs
├── START_HERE.bat              # Windows 一键部署入口
├── scripts/cloudflare/         # 一键部署脚本
├── my-sonicjs-app/             # ★ 生产应用（Cloudflare 部署根目录）
│   ├── src/
│   │   ├── entrypoint.ts       # Worker 入口
│   │   ├── index.ts            # 应用 + 首用户管理员引导
│   │   ├── collections/        # SEO 集合定义
│   │   └── seo/                # 前台 SEO 路由
│   ├── migrations/             # D1 迁移
│   └── wrangler.toml           # 生产 Worker 配置
├── CF_INSTALL.md               # 部署说明摘要
└── package.json                # 根工作区（可选本地脚本）
```

> 本仓库是**你的生产站点**，不是上游 SonicJS 核心开发仓库。  
> CMS 能力通过 npm 包 `@sonicjs-cms/core` 提供。

---

## 常用命令

```bash
# 进入应用目录
cd my-sonicjs-app

npm install
npx wrangler deploy
npx wrangler d1 migrations apply DB --remote
npx wrangler tail   # 看线上日志
```

---

## 注意

- **不要**把管理员密码或 Secret 写进 GitHub
- 普通代码部署**不会**自动跑 D1 migration（避免误伤数据）
- 域名在 Cloudflare 绑定；一键脚本也可配置 Custom Domain
- 旧版 lane711 / 上游演示配置已清理，请使用本仓库 `szfp8` 配置
