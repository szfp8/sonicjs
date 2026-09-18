# 全国财税发票 SEO

Cloudflare Workers + D1 + R2 + KV（基于 SonicJS）。

仓库：https://github.com/szfp8/sonicjs

---

## 一键部署（推荐）

你的 Cloudflare 已清空时，直接点下面按钮即可：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

### 按钮流程

1. 打开上方面板，用 GitHub / Cloudflare 账号授权  
2. 选择仓库 **`szfp8/sonicjs`**（或你的 fork）  
3. 其余保持默认，确认部署  
4. 等待构建成功（会自动创建 D1 / R2 / KV，并执行 `npm run deploy`）  
5. 在 Cloudflare → **Workers & Pages** → **sonicjs** 复制 **`*.workers.dev`** 地址  

### 部署后 3 步

| 步骤 | 打开地址 |
|------|----------|
| ① 检查 | `https://你的域名/status` → 看到 `"ok": true` |
| ② 注册管理员 | `https://你的域名/auth/register` |
| ③ 登录后台 | `https://你的域名/auth/login` → `/admin` |

前台首页：`https://你的域名/`

> **不要填自定义域名**（先用 workers.dev）。**Root directory 留空**。部署命令已是仓库里的 `npm run deploy`。

---

## 备用：控制台连接 Git

若按钮不可用：

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Connect to Git**  
2. 选 **`szfp8/sonicjs`**，分支 **`main`**  
3. 填写：

| 项 | 值 |
|----|-----|
| Root directory | **留空** |
| Build command | `npm run build` |
| Deploy command | **`npm run deploy`** |
| Worker name | `sonicjs` |
| Custom domain | **留空** |

4. **Save and Deploy**

---

## 前台链接

| 功能 | 路径 |
|------|------|
| 首页 | `/` |
| 政策解读 | `/news` |
| 微信文章 | `/wechat` |
| 城市页 | `/city/北京` |
| 咨询 | `/contact` |
| 搜索 | `/search?q=关键词` |
| 状态 | `/status` |
| Sitemap | `/sitemap.xml` |

## 后台链接

| 功能 | 路径 |
|------|------|
| 注册 | `/auth/register` |
| 登录 | `/auth/login` |
| 后台 | `/admin` |
| 首页设置 | `/admin/settings/general`（表单：首页标题/介绍/导航） |
| 政策解读 | `/admin/content?model=seo_article` |
| 微信文章 | `/admin/content?model=wechat_article` |
| 城市正文 | `/admin/content?model=seo_city_page` |

---

## 说明

- **D1 / R2 / KV**：SonicJS 标准绑定，一键部署会自动创建（无需手填 ID）。  
- **INDEXNOW_KEY**：可选，部署脚本会自动生成；不填也不影响站点。  
- 更新代码：推送到 `main` 后，若已连接 Git，Cloudflare 会自动再部署。  
