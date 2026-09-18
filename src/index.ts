/**
 * SonicJS production SEO application.
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
import './admin-beginner-ui';

import blogPostsCollection from './collections/blog-posts.collection';
import seoArticlesCollection from './collections/seo-articles.collection';
import seoCityPagesCollection from './collections/seo-city-pages.collection';
import wechatArticlesCollection from './collections/wechat-articles.collection';
import { handleSeoRequest, pingIndexNow } from './seo/public';

registerCollections([
  siteSettingsCollection,
  blogPostsCollection,
  seoArticlesCollection,
  seoCityPagesCollection,
  wechatArticlesCollection,
]);

const config: SonicJSConfig = {
  auth: {
    extendBetterAuth: (opts: any) => ({
      ...opts,
      // SonicJS uses auth_tenant* (tenant_id) while Better Auth organization plugin
      // expects organizationId. Map fields + disable strict schema validation so
      // login is not blocked by Drizzle/BA column-name mismatch noise.
      advanced: {
        ...(opts.advanced || {}),
        database: {
          ...(opts.advanced?.database || {}),
          validateSchema: false,
        },
      },
      plugins: opts.plugins?.map((plugin: any) => {
        if (plugin?.id !== 'organization') return plugin;
        const schema = plugin.options?.schema ?? {};
        return {
          ...plugin,
          options: {
            ...plugin.options,
            schema: {
              ...schema,
              organization: {
                ...schema.organization,
                modelName: schema.organization?.modelName || 'auth_tenant',
              },
              member: {
                ...schema.member,
                modelName: schema.member?.modelName || 'auth_tenant_member',
                fields: {
                  ...(schema.member?.fields ?? {}),
                  organizationId: 'tenantId',
                },
              },
              invitation: {
                ...schema.invitation,
                modelName: schema.invitation?.modelName || 'auth_tenant_invitation',
                fields: {
                  ...(schema.invitation?.fields ?? {}),
                  organizationId: 'tenantId',
                },
              },
              team: {
                ...schema.team,
                modelName: schema.team?.modelName || 'auth_tenant_team',
                fields: {
                  ...(schema.team?.fields ?? {}),
                  organizationId: 'tenantId',
                },
              },
            },
          },
        };
      }),
    }),
  },
  plugins: {
    register: [redirectPlugin, mcpPlugin(), graphqlPlugin(), versioningPlugin],
    disableAll: false,
  },
  middleware: {
    afterAuth: [async (c: any, next: any) => {
      const sessionUser = c.get('user') as { userId?: string } | undefined;
      const userId = sessionUser?.userId;
      const db = c.env?.DB as D1Database | undefined;

      if (userId && db) {
        try {
          const account = await db
            .prepare('SELECT role, is_super_admin FROM auth_user WHERE id = ? LIMIT 1')
            .bind(userId)
            .first<{ role?: string; is_super_admin?: number | string }>();

          const isSuperAdmin =
            account?.role === 'admin' || Number(account?.is_super_admin) === 1;

          if (isSuperAdmin) {
            const rbac = new RbacService(db);
            const [resources, verbs] = await Promise.all([
              rbac.getResources(),
              rbac.getVerbs(),
            ]);
            const perms = new Set<string>();
            for (const resource of resources) {
              for (const verb of verbs) perms.add(`${resource.key}:${verb.name}`);
            }
            c.set('rbacPerms', [...perms]);
            c.set('user', { ...sessionUser, isSuperAdmin: true, role: 'admin' });
          }
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

async function localizeAdminResponse(request: Request, response: Response): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get('content-type') || '';
  if (!pathname.startsWith('/admin') || !contentType.includes('text/html')) return response;

  const html = await response.text();
  const localizationScript = `<script>
(function () {
  var dict = {
    'Content':'内容','Collections':'内容集合','Users':'用户','Plugins':'插件','Settings':'设置','Docs':'文档','Media':'媒体','Sign Out':'退出登录','Dashboard':'仪表盘',
    'Search':'搜索','Create':'创建','Edit':'编辑','Save':'保存','Delete':'删除','Publish':'发布','Cancel':'取消',
    'Content Management':'内容管理','Blog Posts':'博客文章','SEO Articles':'SEO 文章','SEO City Pages':'SEO 城市页面','WeChat Articles':'微信文章',
    'User':'用户','Email':'邮箱','Role':'角色','Admin':'管理员','Settings':'设置','Site Name':'网站名称'
  };
  var keys = Object.keys(dict).sort(function (a, b) { return b.length - a.length; });
  function translateText(text) { if (!text) return text; var result = text; keys.forEach(function (key) { if (key.length >= 2 && result.indexOf(key) !== -1) result = result.split(key).join(dict[key]); }); return result; }
  function translateNode(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); var nodes = []; var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) { if (!textNode.parentElement) return; var tag = textNode.parentElement.tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return; var original = textNode.nodeValue || ''; var translated = translateText(original); if (translated !== original) textNode.nodeValue = translated; });
  }
  function run() { translateNode(document.body); document.documentElement.lang = 'zh-CN'; if (document.title.indexOf('SonicJS') !== -1) document.title = document.title.replace(/SonicJS AI Admin/g, '财税网站管理后台'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  new MutationObserver(function (mutations) { mutations.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) translateNode(n); }); }); }).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

  const localizedHtml = html.includes('</body>') ? html.replace('</body>', localizationScript + '</body>') : html + localizationScript;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(localizedHtml, { status: response.status, statusText: response.statusText, headers });
}

async function ensureBootstrapAdmin(db: D1Database): Promise<void> {
  try {
    const countRow = await db
      .prepare('SELECT COUNT(*) AS count FROM auth_user')
      .first<{ count: number | string }>();
    if (Number(countRow?.count ?? 0) < 1) return;

    const adminRow = await db
      .prepare("SELECT COUNT(*) AS count FROM auth_user WHERE role = 'admin' OR is_super_admin = 1")
      .first<{ count: number | string }>();
    if (Number(adminRow?.count ?? 0) > 0) return;

    const user = await db
      .prepare('SELECT id FROM auth_user ORDER BY created_at ASC LIMIT 1')
      .first<{ id: string }>();
    if (!user) return;

    await db
      .prepare("UPDATE auth_user SET role = 'admin', is_super_admin = 1, updated_at = ? WHERE id = ?")
      .bind(Date.now(), user.id)
      .run();
    console.log('[Bootstrap] Promoted earliest user to administrator.');
  } catch (error) {
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
