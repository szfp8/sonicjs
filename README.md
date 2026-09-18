# 全国财税发票 SEO

连接 GitHub 即可部署到 Cloudflare Workers。自动创建 D1、R2、KV，首次打开网站时自动建表并生成登录密钥。

**域名留空**，使用 `*.workers.dev`。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

---

## 一键部署（全新 Cloudflare）

### 方式 A：按钮

点击上面的 **Deploy to Cloudflare**，授权 GitHub 和 Cloudflare，等待部署完成。

### 方式 B：控制台连接 GitHub

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. **Create** → **Connect to Git** → 选择仓库 **`szfp8/sonicjs`**
3. 按下面填写（其余默认）：

| 项 | 值 |
|----|-----|
| 分支 | `main` |
| Root directory | **留空** |
| 构建命令 | `npm run build` |
| **部署命令** | **`npm run deploy`** |
| Worker 名称 | `sonicjs` |
| 域名 / Custom Domain | **留空** |

4. Save and Deploy

不要再填 `my-sonicjs-app`。仓库根目录就是应用。

---

## 部署成功后

打开 Worker 的 `*.workers.dev` 地址：

1. `/status` — `ok` 应为 `true`，`DB` 和 `migrated` 应为 `true`
2. `/auth/register` — 注册第一个用户（自动成为管理员）
3. `/auth/login` → `/admin`

前台：`/` · `/city/北京` · `/news`
