# 全国财税发票 SEO

Cloudflare Workers + 新建 D1 / R2 / KV（基于 SonicJS）。

仓库：https://github.com/szfp8/sonicjs

---

## 一键部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs)

或：Workers & Pages → Create → Connect to Git → `szfp8/sonicjs` / `main`：

| 项 | 值 |
|----|-----|
| Root directory | **留空** |
| Build command | `npm run build` |
| **Deploy command** | **`npm run deploy`** |
| Worker name | `sonicjs` |
| Custom domain | **留空** |

`npm run deploy` 会：新建 D1/R2/KV → 发布 Worker → 空库建表 → 自动写入 Secret（若尚未存在）。

---

## 密钥（JWT / Better Auth）

**只作为 Cloudflare Secret，不要写进 `wrangler.toml`，不要提交 Git。**

### 控制台添加

1. Workers → **sonicjs** → Settings → **Variables and Secrets**
2. Add → 类型选 **Secret**（不要选 Plain text）

| 名称 | 说明 |
|------|------|
| `JWT_SECRET` | 会话/CSRF，随机长字符串 |
| `BETTER_AUTH_SECRET` | 认证，另一串随机 |
| `INDEXNOW_KEY` | 可选 |

生成示例（浏览器 F12）：`crypto.randomUUID() + crypto.randomUUID()`

### 关于「使用此配置更新您的 Wrangler 配置」

- 这是 Cloudflare 对**普通变量/绑定**的提示。
- **Secret 不要**同步进仓库里的 `wrangler.toml`。
- 已有 Secret 会在下次 `npm run deploy` 时保留（脚本检测到已存在则跳过）。

---

## 部署后检查

1. `https://你的域名/status`  
   期望：`ok: true`，`DB/JWT_SECRET/migrated: true`
2. `/auth/register` 注册（填 First Name / Last Name / Email / Password）
3. `/auth/login` → `/admin`
4. 前台 `/`

### 当前自检结果（参考）

若 `/status` 已为 `ok: true` 且 `migrated: true`，注册接口 `/auth/register/form` 应返回成功并跳转后台。

---

## 前台 / 后台

| 前台 | 路径 | 后台 | 路径 |
|------|------|------|------|
| 首页 | `/` | 注册 | `/auth/register` |
| 政策 | `/news` | 登录 | `/auth/login` |
| 微信 | `/wechat` | 后台 | `/admin` |
| 城市 | `/city/北京` | 首页设置 | `/admin/settings/general` |
| 咨询 | `/contact` | 城市正文 | `/admin/content?model=seo_city_page` |
| 状态 | `/status` | 微信文章 | `/admin/content?model=wechat_article` |
