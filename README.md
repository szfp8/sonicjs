# SonicJS 财税 SEO Production Edition

基于 SonicJS、Cloudflare Workers 与 D1 的生产级内容管理与 SEO 获客方案。

## 项目定位

本版本面向企业网站、财税服务站点以及需要长期 SEO 内容运营的场景。

核心目标：

- 稳定运行在 Cloudflare Edge 环境
- 使用 D1 保存内容、关键词和业务数据
- 提供后台内容管理能力
- 支持大量 SEO 页面扩展
- 保持 `main` 分支稳定可靠

---

## 核心能力

### Cloudflare 部署

支持：

- Cloudflare Workers
- Cloudflare D1 数据库
- Cloudflare R2 文件存储
- 自定义域名绑定
- Secrets 安全配置

生产环境原则：

- 域名由部署者自行配置
- 管理员账号由首次安装创建
- 密钥不提交到 Git 仓库
- 测试功能不会直接进入 main

---

## SEO 内容系统

支持建设长期搜索流量入口：

- 城市 + 服务关键词页面
- 行业解决方案页面
- 企业知识文章
- FAQ 问答页面
- 自动 Sitemap
- 内链结构优化

内容建议流程：

来源信息 → 原创整理 → 企业价值解读 → SEO 页面发布

---

## 数据管理

数据层支持：

- Cloudflare D1
- SQLite 兼容结构
- 内容管理
- 关键词管理
- 页面数据管理

---

## 开发流程

所有修改必须遵循：

1. 创建独立开发分支
2. 完成功能或文档修改
3. 检查 Git diff
4. 创建 Pull Request
5. Review 通过后合并 main

禁止：

- 未测试代码直接进入 main
- 半成品功能直接发布生产

---

## 生产部署原则

上线前检查：

- 数据库迁移完成
- 环境变量配置完成
- 管理后台可登录
- SEO 页面可访问
- Sitemap 正常生成

---

## 当前维护策略

本仓库采用生产优先策略。

所有重大修改通过 Pull Request 管理，确保主分支保持稳定。
