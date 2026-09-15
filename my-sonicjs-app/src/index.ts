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
 * Lightweight Chinese localization for the SonicJS admin UI.
 *
 * SonicJS currently renders the admin as server-side HTML without a locale
 * bundle. Rather than rewriting the core framework or changing stored content,
 * inject a small browser-side translation layer into /admin HTML. It also uses
 * a MutationObserver so HTMX/AJAX-rendered admin fragments are translated.
 */
async function localizeAdminResponse(request: Request, response: Response): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get('content-type') || '';
  if (!pathname.startsWith('/admin') || !contentType.includes('text/html')) return response;

  const html = await response.text();
  const localizationScript = `<script>
(function () {
  var dict = {
    'Content':'内容',
    'Collections':'内容集合',
    'Users':'用户',
    'Plugins':'插件',
    'Settings':'设置',
    'Docs':'文档',
    'API Docs':'API 文档',
    'Developer Docs':'开发者文档',
    'OpenAPI':'开放 API',
    'Close menu':'关闭菜单',
    'Open navigation':'打开导航',
    'Toggle plugins submenu':'切换插件菜单',
    'My Profile':'个人资料',
    'Sign Out':'退出登录',
    'Dashboard':'仪表盘',
    'Home':'首页',
    'Search':'搜索',
    'Create':'创建',
    'Create New':'新建',
    'New':'新建',
    'Edit':'编辑',
    'Save':'保存',
    'Save Changes':'保存更改',
    'Cancel':'取消',
    'Delete':'删除',
    'Remove':'移除',
    'Publish':'发布',
    'Unpublish':'取消发布',
    'Draft':'草稿',
    'Published':'已发布',
    'Actions':'操作',
    'Action':'操作',
    'Status':'状态',
    'Title':'标题',
    'Description':'描述',
    'Name':'名称',
    'Email':'邮箱',
    'Role':'角色',
    'User':'用户',
    'Admin':'管理员',
    'Administrator':'管理员',
    'Viewer':'查看者',
    'Editor':'编辑者',
    'Loading...':'加载中...',
    'Loading':'加载中',
    'No results':'暂无结果',
    'No records found':'未找到记录',
    'No records':'暂无记录',
    'No data':'暂无数据',
    'View Details':'查看详情',
    'Details':'详情',
    'Back':'返回',
    'Next':'下一页',
    'Previous':'上一页',
    'Previous page':'上一页',
    'Next page':'下一页',
    'Page':'页',
    'of':'共',
    'Filter':'筛选',
    'Filters':'筛选条件',
    'Clear':'清除',
    'Apply':'应用',
    'Reset':'重置',
    'Select':'选择',
    'Selected':'已选择',
    'All':'全部',
    'None':'无',
    'Enabled':'已启用',
    'Disabled':'已禁用',
    'Active':'启用',
    'Inactive':'停用',
    'Enable':'启用',
    'Disable':'停用',
    'Import':'导入',
    'Export':'导出',
    'Upload':'上传',
    'Download':'下载',
    'Refresh':'刷新',
    'Close':'关闭',
    'Confirm':'确认',
    'Yes':'是',
    'No':'否',
    'Success':'成功',
    'Error':'错误',
    'Warning':'警告',
    'Information':'提示',
    'Welcome':'欢迎',
    'Profile':'个人资料',
    'Account':'账户',
    'Password':'密码',
    'Security':'安全',
    'Authentication':'身份验证',
    'General':'常规',
    'System':'系统',
    'Media':'媒体',
    'Files':'文件',
    'Logs':'日志',
    'Migrations':'迁移',
    'Plugin':'插件',
    'Version':'版本',
    'Documentation':'文档',
    'API Reference':'API 参考',
    'Content Management':'内容管理',
    'Site Settings':'网站设置',
    'Blog Posts':'博客文章',
    'SEO Articles':'SEO 文章',
    'SEO City Pages':'SEO 城市页面',
    'City Pages':'城市页面',
    'Source':'来源',
    'Source URL':'来源链接',
    'Original Interpretation':'原创解读',
    'Business Value':'企业实际价值',
    'Published At':'发布时间',
    'Pending':'待处理',
    'Required':'必填',
    'Optional':'可选',
    'true':'是',
    'false':'否'
  };

  function translateText(text) {
    var value = (text || '').trim();
    if (!value) return text;
    if (dict[value]) return text.replace(value, dict[value]);
    var result = text;
    Object.keys(dict).forEach(function (key) {
      if (key.length < 2) return;
      result = result.split(key).join(dict[key]);
    });
    return result;
  }

  function translateNode(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      if (!textNode.parentElement) return;
      var tag = textNode.parentElement.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
      var translated = translateText(textNode.nodeValue || '');
      if (translated !== textNode.nodeValue) textNode.nodeValue = translated;
    });

    (root || document).querySelectorAll('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(function (el) {
      ['placeholder','title','aria-label'].forEach(function (attr) {
        if (el.hasAttribute(attr)) {
          var value = el.getAttribute(attr);
          var translated = translateText(value || '');
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
