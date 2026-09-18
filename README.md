# 全国财税发票 SEO（szfp8）

Cloudflare Workers + D1 + R2。**只需连接 GitHub，在 Cloudflare 里一键部署。**

不需要本地电脑、不需要域名、不需要本机安装 Node。

**仓库：** https://github.com/szfp8/sonicjs

---

## 一键部署（全新 Cloudflare 账号）

### 只做这几步

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. **Create** → 选择 **Connect to Git**（连接 GitHub）
3. 授权 GitHub，选择仓库 **`szfp8/sonicjs`**
4. 构建设置填：

| 项 | 值 |
|----|-----|
| 分支 | `main` |
| **Root directory** | **`my-sonicjs-app`** |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |

5. **域名 / Custom Domain：留空**
6. 点 **Save and Deploy**

部署成功后，在 Worker 页面复制 **`*.workers.dev`** 地址即可访问。

之后每次推送 `main`，Cloudflare 会自动重新部署。

---

## 部署成功后（只需一次）

### 1. 添加数据库与存储（控制台）

Worker → **Settings** → **Bindings**：

| 类型 | 变量名 | 操作 |
|------|--------|------|
| D1 | `DB` | 新建数据库，名称随意（如 `szfp8-tax-seo-db`） |
| R2 | `MEDIA_BUCKET` | 新建 Bucket（如 `szfp8-tax-seo-media`） |

保存后可再点一次 **Deploy**（或等下次 git 推送）。

### 2. 添加 Secrets（控制台）

Worker → **Settings** → **Variables and Secrets** → **Secrets**：

| 名称 | 值 |
|------|-----|
| `JWT_SECRET` | 随便一长串随机字符 |
| `BETTER_AUTH_SECRET` | 另一串随机字符 |

### 3. 注册管理员

浏览器打开：`https://你的.workers.dev/auth/register`  
注册第一个用户 → `/auth/login` → `/admin`

---

## 说明

- **域名绑定：留空**（先用 workers.dev）
- 代码在 GitHub，构建在 Cloudflare，不在本地部署
- 不要把密码写进仓库

### 常用路径

`/` · `/city/北京` · `/news` · `/admin` · `/auth/login`
