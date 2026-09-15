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
    return seoResponse || app.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Record<string, unknown>, ctx: ExecutionContext) {
    await coreScheduled(controller, env, ctx);
    const siteUrl = String(env.SITE_URL || 'https://example.com');
    await pingIndexNow(new Request(siteUrl), env as never);
  },
};
