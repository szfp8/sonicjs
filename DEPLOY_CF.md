# 财税 SEO Cloudflare 一键部署说明

## Cloudflare Worker 部署

本仓库目标：部署到 Cloudflare Workers + D1 + R2。

部署前：

1. 在 Cloudflare 创建 D1 数据库
2. 创建 R2 Bucket
3. 在 wrangler.toml 填入数据库和存储绑定
4. 设置密钥：

```bash
wrangler secret put JWT_SECRET
wrangler secret put BETTER_AUTH_SECRET
```

## Cloudflare Deploy Button

使用当前仓库：

```text
https://deploy.workers.cloudflare.com/?url=https://github.com/szfp8/sonicjs
```

## 财税 SEO 模块规划

- 城市 SEO 页面
- robots.txt
- sitemap.xml
- 多语言自动选择
- 微信文章发布入口
- 获客留言管理
- 支付接口扩展

## 注意

域名绑定由用户自己的 Cloudflare 控制台完成，不写死在仓库中。
