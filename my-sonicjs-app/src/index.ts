/**
 * SonicJS production SEO application.
 *
 * The SonicJS admin/API remains the backend. The SEO layer adds a public
 * website, 314 city landing pages, sitemap/robots, lead capture, and optional
 * IndexNow notifications without hard-coded admin credentials.
 */

import type { SonicJSConfig } from '@sonicjs-cms/core';
import {
  collectCronSchedules,
  createScheduledHandler,
  createSonicJSApp,
  getHookSystem,
  graphqlPlugin,
  mcpPlugin,
  redirectPlugin,
  registerCollections,
  RbacService,
  siteSettingsCollection,
  versioningPlugin,
} from '@sonicjs-cms/core';
import type { D1Database } from '@cloudflare/workers-types';
import './user-profile.model';

import blogPostsCollection from './collections/blog-posts.collection';
import seoArticlesCollection from './collections/seo-articles.collection';
import seoCityPagesCollection from './collections/seo-city-pages.collection';
import { handleSeoRequest, pingIndexNow } from './seo/public';

registerCollections([
  siteSettingsCollection,
  blogPostsCollection,
  seoArticlesCollection,
  seoCityPagesCollection,
]);

const config: SonicJSConfig = {
  plugins: {
    register: [redirectPlugin, mcpPlugin(), graphqlPlugin(), versioningPlugin],
    disableAll: false,
  },
  middleware: {
    // The current SonicJS admin uses document-backed RBAC as its authorization
    // source. A fresh install can temporarily miss its RBAC assignment because
    // the registration hook runs during bootstrap. The first registered user is
    // marked isSuperAdmin by the repair below; this middleware gives that user
    // the complete live permission matrix without changing normal RBAC users.
    afterAuth: [async (c: any, next: any) => {
      const user = c.get('user') as { userId?: string; isSuperAdmin?: boolean } | undefined;
      if (user?.userId && user.isSuperAdmin === true) {
        try {
          const rbac = new RbacService(c.env.DB);
          const [resources, verbs] = await Promise.all([
            rbac.getResources(),
            rbac.getVerbs(),
          ]);
          const perms = new Set<string>();
          for (const resource of resources) {
            for (const verb of verbs) perms.add(`${resource.key}:${verb.name}`);
          }
          c.set('rbacPerms', [...perms]);
        } catch (error) {
          console.warn('[Bootstrap] Super-admin permission matrix unavailable:', error);
        }
      }
      return next();
    }],
  },
};

const app = createSonicJSApp(config);
const allCronPlugins = [...(config.plugins?.register ?? [])];
const coreScheduled = createScheduledHandler({
  plugins: allCronPlugins,
  getHooks: getHookSystem,
  boot: app.boot,
});

const schedules = collectCronSchedules(allCronPlugins);
if (schedules.length > 0) console.log('[cron] Declared schedules:', schedules.join(', '));

/**
 * Chinese localization for the SonicJS admin UI.
 *
 * SonicJS currently renders the admin as server-side HTML without a locale
 * bundle. This compatibility layer translates the visible admin UI while
 * keeping the core framework and stored content unchanged. A MutationObserver
 * also translates HTMX/AJAX-rendered fragments after navigation.
 */
async function localizeAdminResponse(request: Request, response: Response): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get('content-type') || '';
  if (!pathname.startsWith('/admin') || !contentType.includes('text/html')) return response;

  const html = await response.text();
  const localizationScript = `<script>
(function () {
  var dict = {
    /* Navigation */
    'Content':'内容',
    'Collections':'内容集合',
    'Users':'用户',
    'Plugins':'插件',
    'Settings':'设置',
    'Docs':'文档',
    'Media':'媒体',
    'Lexical Editor':'Lexical 编辑器',
    'Two-Factor Auth':'双因素认证',
    'API Docs':'API 文档',
    'Developer Docs':'开发者文档',
    'OpenAPI':'开放 API',
    'Documentation':'文档',
    'API Reference':'API 参考',
    'Close menu':'关闭菜单',
    'Open navigation':'打开导航',
    'Toggle plugins submenu':'切换插件菜单',
    'My Profile':'个人资料',
    'Sign Out':'退出登录',
    'Dashboard':'仪表盘',
    'Home':'首页',

    /* Common actions */
    'Search':'搜索',
    'Advanced Search':'高级搜索',
    'Create':'创建',
    'Create New':'新建',
    'New':'新建',
    'Add':'添加',
    'Edit':'编辑',
    'Save':'保存',
    'Save Changes':'保存更改',
    'Cancel':'取消',
    'Delete':'删除',
    'Remove':'移除',
    'Publish':'发布',
    'Unpublish':'取消发布',
    'Preview':'预览',
    'View':'查看',
    'View Details':'查看详情',
    'Details':'详情',
    'Back':'返回',
    'Next':'下一页',
    'Previous':'上一页',
    'Previous page':'上一页',
    'Next page':'下一页',
    'Refresh':'刷新',
    'Reload':'重新加载',
    'Close':'关闭',
    'Confirm':'确认',
    'Apply':'应用',
    'Reset':'重置',
    'Clear':'清除',
    'Import':'导入',
    'Export':'导出',
    'Upload':'上传',
    'Download':'下载',
    'Select':'选择',
    'Selected':'已选择',
    'Select All':'全选',
    'Deselect All':'取消全选',
    'Bulk Actions':'批量操作',
    'Actions':'操作',
    'Action':'操作',

    /* Content management */
    'Content Management':'内容管理',
    'Manage and organize your content items':'管理和组织您的内容项目',
    'Model':'模型',
    'Models':'模型',
    'Blog Post':'博客文章',
    'Blog Posts':'博客文章',
    'Email Log':'邮件日志',
    'Email Logs':'邮件日志',
    'Redirect':'重定向',
    'Redirects':'重定向',
    'SEO Articles':'SEO 文章',
    'SEO City Pages':'SEO 城市页面',
    'City Pages':'城市页面',
    'SEO Policy Interpretation':'SEO 政策解读',
    'Policy Interpretation':'政策解读',
    'Welcome to SonicJS':'欢迎使用 SonicJS',
    'Welcome':'欢迎',
    'Showing':'显示',
    'results':'条结果',
    'result':'条结果',
    'Per page':'每页显示',
    'No results':'暂无结果',
    'No records found':'未找到记录',
    'No records':'暂无记录',
    'No data':'暂无数据',
    'Filter':'筛选',
    'Filters':'筛选条件',
    'All Models':'全部模型',
    'All Status':'全部状态',
    'Status':'状态',
    'Title':'标题',
    'Description':'描述',
    'Slug':'URL 别名',
    'Content':'内容',
    'Excerpt':'摘要',
    'Category':'分类',
    'Tags':'标签',
    'Author':'作者',
    'Updated':'更新时间',
    'Created':'创建时间',
    'Created At':'创建时间',
    'Updated At':'更新时间',
    'Published At':'发布时间',
    'Published':'已发布',
    'Unpublished':'未发布',
    'Draft':'草稿',
    'Under Review':'审核中',
    'Scheduled':'已排期',
    'Archived':'已归档',
    'Deleted':'已删除',
    'deleted':'已删除',

    /* SEO-specific */
    'Source':'来源',
    'Source Name':'来源名称',
    'Source URL':'来源链接',
    'Original Interpretation':'原创解读',
    'Business Value':'企业实际价值',
    'Keyword':'关键词',
    'Keywords':'关键词',
    'SEO Title':'SEO 标题',
    'SEO Description':'SEO 描述',
    'Meta Title':'Meta 标题',
    'Meta Description':'Meta 描述',
    'Canonical URL':'规范 URL',
    'City':'城市',
    'Province':'省份',
    'District':'区县',
    'Service':'服务',
    'Services':'服务项目',
    'Phone':'电话',
    'Contact Phone':'联系电话',
    'Address':'地址',
    'Website':'网站',

    /* Users and permissions */
    'User':'用户',
    'Users':'用户',
    'Name':'名称',
    'Email':'邮箱',
    'Role':'角色',
    'Roles':'角色',
    'Admin':'管理员',
    'Administrator':'管理员',
    'Super Admin':'超级管理员',
    'Superadmin':'超级管理员',
    'Viewer':'查看者',
    'Editor':'编辑者',
    'Guest':'访客',
    'Permissions':'权限',
    'Permission':'权限',
    'Access':'访问权限',
    'Account':'账户',
    'Profile':'个人资料',
    'Password':'密码',
    'Change Password':'修改密码',
    'Confirm Password':'确认密码',
    'Email Address':'邮箱地址',
    'First Name':'名字',
    'Last Name':'姓氏',
    'Active':'启用',
    'Inactive':'停用',
    'Enabled':'已启用',
    'Disabled':'已禁用',
    'Enable':'启用',
    'Disable':'禁用',

    /* Settings and system */
    'Site Settings':'网站设置',
    'General':'常规',
    'System':'系统',
    'Security':'安全',
    'Authentication':'身份验证',
    'Two Factor Authentication':'双因素认证',
    'Two-Factor Authentication':'双因素认证',
    'Two-Factor':'双因素认证',
    'Session':'会话',
    'Sessions':'会话',
    'Environment':'运行环境',
    'Production':'生产环境',
    'Development':'开发环境',
    'Configuration':'配置',
    'Database':'数据库',
    'Storage':'存储',
    'Files':'文件',
    'Logs':'日志',
    'Migrations':'数据库迁移',
    'Version':'版本',
    'Site Name':'网站名称',
    'Site URL':'网站地址',
    'Save Settings':'保存设置',
    'System Settings':'系统设置',
    'Plugin Settings':'插件设置',
    'Media Library':'媒体库',

    /* Plugins */
    'Plugin':'插件',
    'Plugins':'插件',
    'Plugin Manager':'插件管理',
    'Installed':'已安装',
    'Install':'安装',
    'Uninstall':'卸载',
    'Activate':'启用',
    'Deactivate':'停用',
    'Activated':'已启用',
    'Deactivated':'已停用',
    'Lexical':'Lexical 编辑器',
    'Lexical Editor Plugin':'Lexical 编辑器插件',
    'Versioning':'版本管理',
    'Redirect Plugin':'重定向插件',
    'GraphQL':'GraphQL',
    'MCP':'MCP',

    /* Forms / feedback */
    'Required':'必填',
    'Optional':'可选',
    'Invalid':'无效',
    'Valid':'有效',
    'Success':'成功',
    'Error':'错误',
    'Warning':'警告',
    'Information':'提示',
    'Info':'信息',
    'Loading...':'加载中...',
    'Loading':'加载中',
    'Saving...':'保存中...',
    'Saved':'已保存',
    'Changes saved':'更改已保存',
    'Failed':'失败',
    'Are you sure?':'确定要继续吗？',
    'Yes':'是',
    'No':'否',
    'None':'无',
    'All':'全部',
    'true':'是',
    'false':'否'
  };

  /* Longer phrases must be replaced before shorter words. */
  var keys = Object.keys(dict).sort(function (a, b) { return b.length - a.length; });

  function translateText(text) {
    if (!text) return text;
    var result = text;
    keys.forEach(function (key) {
      if (key.length < 2 || result.indexOf(key) === -1) return;
      result = result.split(key).join(dict[key]);
    });
    return result;
  }

  function translateNode(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      if (!textNode.parentElement) return;
      var tag = textNode.parentElement.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
      var original = textNode.nodeValue || '';
      var translated = translateText(original);
      if (translated !== original) textNode.nodeValue = translated;
    });

    root.querySelectorAll && root.querySelectorAll('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(function (el) {
      ['placeholder','title','aria-label'].forEach(function (attr) {
        if (el.hasAttribute(attr)) {
          var value = el.getAttribute(attr) || '';
          var translated = translateText(value);
          if (translated !== value) el.setAttribute(attr, translated);
        }
      });
    });
  }

  function run() {
    translateNode(document.body);
    document.documentElement.lang = 'zh-CN';
    document.title = translateText(document.title).replace(/SonicJS AI Admin/g, '财税网站管理后台');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) translateNode(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

  const localizedHtml = html.includes('</body>')
    ? html.replace('</body>', localizationScript + '</body>')
    : html + localizationScript;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(localizedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Repair the bootstrap account when registration completed but its RBAC
 * post-registration hook could not finish. This is intentionally conservative:
 * only a database containing exactly one user is eligible, so a later install
 * with multiple users can never silently promote an arbitrary account.
 *
 * The legacy auth_user role + is_super_admin fields are deliberately repaired
 * before the normal SonicJS middleware runs. The afterAuth hook above then
 * bridges this bootstrap-only flag into the current document-backed permission
 * matrix. No password, email, or account identifier is stored in source code.
 */
async function ensureBootstrapAdmin(db: D1Database): Promise<void> {
  try {
    const countRow = await db
      .prepare('SELECT COUNT(*) AS count FROM auth_user')
      .first<{ count: number | string }>();
    const userCount = Number(countRow?.count ?? 0);
    if (userCount !== 1) return;

    const user = await db
      .prepare('SELECT id, role, is_super_admin FROM auth_user ORDER BY created_at ASC LIMIT 1')
      .first<{ id: string; role: string; is_super_admin: number }>();
    if (!user) return;

    if (user.role !== 'admin' || Number(user.is_super_admin) !== 1) {
      await db
        .prepare("UPDATE auth_user SET role = 'admin', is_super_admin = 1, updated_at = ? WHERE id = ?")
        .bind(Date.now(), user.id)
        .run();
      console.log('[Bootstrap] Promoted the first registered user to administrator.');
    }
  } catch (error) {
    // Never block public traffic because this repair is unavailable.
    console.warn('[Bootstrap] First-user admin repair skipped:', error);
  }
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const db = (env as { DB?: D1Database }).DB;
    if (db) await ensureBootstrapAdmin(db);

    const seoResponse = await handleSeoRequest(request, env as never);
    if (seoResponse) return seoResponse;

    const adminResponse = await app.fetch(request, env, ctx);
    return localizeAdminResponse(request, adminResponse);
  },

  async scheduled(controller: ScheduledController, env: Record<string, unknown>, ctx: ExecutionContext) {
    await coreScheduled(controller, env, ctx);
    const siteUrl = String(env.SITE_URL || 'https://example.com');
    await pingIndexNow(new Request(siteUrl), env as never);
  },
};
