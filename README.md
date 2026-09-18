# 全国财税发票 SEO 网站

基于 Cloudflare Workers + D1 + R2 的**生产应用仓库**（财税城市 SEO / 政策资讯 / 获客）。

- 域名示例：`https://szfp8.com`
- Worker：`szfp8-tax-seo`
- 应用目录：`my-sonicjs-app/`（真正部署的代码）
- 后台：SonicJS 管理端（`/admin`），不写死管理员密码

---

## 一键部署（推荐）

### 方式 A：Windows 双击部署

1. 安装 [Node.js 20+](https://nodejs.org/)
2. 克隆本仓库到本地
3. **双击根目录** `START_HERE.bat`
4. 按提示输入：Worker 名称、域名、D1 名称、网站名称、联系电话

脚本会自动：

- 登录 Cloudflare（如需要）
- 读取已有 D1
- 写入密钥：`JWT_SECRET` / `BETTER_AUTH_SECRET` / `INDEXNOW_KEY`
- 部署 Worker 并绑定自定义域名

### 方式 B：Cloudflare Workers Builds（Git 连接）

| 项 | 值 |
|---|---|
| Repository | `szfp8/sonicjs` |
| Branch | `main` |
| **Root directory** | **`my-sonicjs-app`** |
| Install | `npm install` |
| Build | `npm run build` |
| Deploy | `npx wrangler deploy` |

部署成功后，在 Cloudflare → Worker → Settings → **Secrets** 中设置（若未用 `START_HERE.bat`）：

```bash
JWT_SECRET
BETTER_AUTH_SECRET
```

可选：`INDEXNOW_KEY`

公开变量（vars，已在 `my-sonicjs-app/wrangler.toml` 示例）：

- `SITE_URL` = `https://szfp8.com`
- `SITE_NAME` = `全国财税发票服务`
- `BETTER_AUTH_URL` = 与 SITE_URL 相同

### 方式 C：命令行

```bash
git clone https://github.com/szfp8/sonicjs.git
cd sonicjs
node scripts/cloudflare/setup.mjs
```

---

## 部署后首次使用

1. （如尚未迁移）在 `my-sonicjs-app` 执行：
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
2. 打开 `https://你的域名/auth/register` **注册第一个用户**
3. 打开 `https://你的域名/auth/login` 登录
4. 进入 `/admin` 后台

系统会在「没有任何管理员」时，自动把最早注册的用户提升为管理员。

> 密码与密钥**不要**写进 GitHub，只放在 Cloudflare Secrets。

---

## 网站入口

| 路径 | 说明 |
|------|------|
| `/` | 首页（含全国城市入口） |
| `/city/北京` 等 | 314+ 城市 SEO 落地页 |
| `/news` | 政策 / 资讯列表 |
| `/article/<slug>` | 文章详情 |
| `/search?q=` | 站内搜索 |
| `/contact` | 获客表单 |
| `/robots.txt` | 爬虫规则 |
| `/sitemap.xml` | 站点地图 |
| `/auth/login` | 登录 |
| `/admin` | 管理后台 |

后台内容类型示例：SEO 文章、SEO 城市页、博客等（可在 `/admin` 维护）。

---

## 目录结构（生产向）

```
szfp8/sonicjs
├── START_HERE.bat              # Windows 一键部署入口
├── scripts/cloudflare/setup.mjs  # 一键部署脚本
├── CF_INSTALL.md               # 部署说明与清单
├── my-sonicjs-app/             # ★ 生产应用（CF Root Directory）
│   ├── src/
│   │   ├── entrypoint.ts       # Worker 入口
│   │   ├── index.ts            # CMS + SEO + 中文后台
│   │   ├── collections/        # 内容模型
│   │   └── seo/                # 前台 SEO 页面
│   ├── migrations/             # D1 迁移
│   └── wrangler.toml           # 生产 Worker 配置
├── install/                    # 补充安装文档
└── packages/                   # SonicJS 核心源码（依赖；日常部署不改）
```

日常只改 **`my-sonicjs-app/`** 即可。

---

## 本地开发（可选）

```bash
cd my-sonicjs-app
npm install
npx wrangler d1 migrations apply DB --local
npx wrangler dev
```

访问 `http://localhost:8787`。

本地密钥可参考 `my-sonicjs-app/.dev.vars.example` 复制为 `.dev.vars`（勿提交）。

---

## 生产资源约定

| 资源 | 名称 |
|------|------|
| Worker | `szfp8-tax-seo` |
| D1 | `szfp8-tax-seo-db` |
| R2 | `szfp8-tax-seo-media` |
| 站点 | `https://szfp8.com` |

D1 migration **与代码部署分离**：普通 `wrangler deploy` 不自动跑远程 migration，避免误伤生产库。需要改表结构时再单独执行 `d1 migrations apply --remote`。

---

## 常见问题

**登录后提示无权限**  
检查是否设置了 `JWT_SECRET` 和 `BETTER_AUTH_SECRET`，重新部署后用无痕窗口登录。若仍无管理员，再注册/登录一次以触发首用户提升。

**构建报 semver 类型错误**  
`main` 已包含 `@types/semver` 修复；请使用最新 `main` 重新部署。

**Worker 名称与 CI 不一致**  
以 Cloudflare 项目绑定的 Worker 名为准；`my-sonicjs-app/wrangler.toml` 中的 `name` 可与之一致。

---

## 许可

本仓库应用层用于 `szfp8` 财税 SEO 生产部署。底层 CMS 能力来自 [SonicJS](https://sonicjs.com)（MIT）。
