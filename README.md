# SonicJS 财税 SEO Production Edition

## 项目定位

基于 SonicJS + Cloudflare Edge + D1 的内容管理与 SEO 获客基础。

目标：

- 稳定部署到 Cloudflare Workers
- 支持 D1 数据库存储
- 支持后台内容管理
- 支持 SEO 页面扩展
- 保持 main 分支稳定

## 开发流程

所有功能修改先进入独立分支：

1. 创建 feature/docs 分支
2. 完成代码或文档修改
3. 检查 diff
4. 创建 Pull Request
5. Review 后合并 main

## Cloudflare 部署原则

- 域名由部署者自行绑定
- 管理员账号由首次安装流程创建
- 密钥不写入仓库
- 生产配置使用 Cloudflare Secrets

## 数据层

支持：

- Cloudflare D1
- SQLite 兼容结构
- 内容与关键词数据管理

## SEO 内容策略

建议结构：

- 城市关键词页面
- 服务关键词页面
- 行业知识文章
- FAQ 页面
- Sitemap 自动生成

## 当前状态

本仓库保持生产稳定优先。

任何未验证功能不得直接进入 main。
