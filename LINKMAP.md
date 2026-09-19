# 前台路由与链接对照（无死链设计）

## 公开页面（均有真实处理函数）

| 路径 | 处理位置 | 说明 |
|------|----------|------|
| `/` | `public.ts` home | 首页 |
| `/news` | `enhanced.ts` | 资讯列表 |
| `/article/:slug` | `enhanced.ts` | 文章详情 |
| `/wechat` | `enhanced.ts` | 微信文章列表 |
| `/wechat/:slug` | `enhanced.ts` | 微信详情 |
| `/search?q=` | `enhanced.ts` | 搜索 |
| `/contact` | `public.ts` | 咨询表单 |
| `/api/lead` POST | `public.ts` | 提交线索 |
| `/city/:name` | `public.ts` | 城市页 |
| `/robots.txt` | `public.ts` / enhanced | 爬虫 |
| `/sitemap.xml` | `enhanced.ts` 优先 | 站点地图 |
| `/status` | `entrypoint.ts` | 健康检查 |

## 后台 / 登录

| 路径 | 说明 |
|------|------|
| `/auth/register` | 首用户注册 → 升管理员 |
| `/auth/login` | 登录 |
| `/admin` | 数据概览 |
| `/admin/content` | 内容集合 |
| `/admin/content?model=seo_article` | SEO 文章 |
| `/admin/content?model=seo_city_page` | 城市页 |
| `/admin/content?model=wechat_article` | 微信文章 |
| `/admin/settings/general` | 系统设置 |
| `/admin/settings/api/home` | 首页设置 API |
| `/admin/settings/api/seo` | SEO API |
| `/admin/settings/api/ai-seo` | AI 关键词 API |
| `/admin/settings/api/geo` | GEO API |
| `/admin/settings/api/lead` | 获客 API |
| `/admin/users` | 用户 |

## 前台导航对齐

- 顶栏：首页 / 服务(#services) / 城市(#cities) / 资讯(/news) / 咨询(/contact)
- 底栏（手机）：首页 / 服务 / 资讯 / 咨询
- 城市胶囊 → `/city/北京` 等（encodeURIComponent）
- 搜索 → `/search?q=`
- 电话 → `tel:`
- 微信/QQ/TG/WA → 后台获客设置控制

## 已知非死链的「空内容」

- `/news` 无文章时显示「暂无已发布文章」（路由正常）
- `/city/某城` 无后台正文时显示默认文案（路由正常）

## 线上 URL 注意

`wrangler.toml` 中 `name = "sonicjs"`。  
Deploy to Cloudflare 后真实地址一般为：

`https://sonicjs.<你的子域>.workers.dev`

若你使用自定义 Workers 名称 `tax-seo-v6`，请在 Cloudflare 部署页把 Worker name 设为该名称，或访问 Dashboard 中显示的真实 `*.workers.dev` 地址。  
当前探测 `sonicjs.tax-seo-v6.workers.dev` 返回 404/1042 时，说明该主机名未绑定到有效 Worker，请以 Dashboard 为准。
