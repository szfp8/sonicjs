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
  siteSettingsCollection,
  versioningPlugin,
} from '@sonicjs-cms/core';
import type { D1Database } from '@cloudflare/workers-types';
import { RbacService } from '@sonicjs-cms/core/services/rbac';
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
 * Both authorization sources are repaired:
 *   1. legacy auth_user.role / is_super_admin compatibility fields
 *   2. document-backed rbac_user_roles assignment used by current admin guards
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

    // Current SonicJS authorization is document-backed RBAC. Make sure the
    // system roles exist and explicitly assign Administrator to the first user.
    const rbac = new RbacService(db);
    await rbac.ensureSystemRbacSeed();
    await rbac.addUserRoleByName(user.id, 'admin');

    // Keep legacy compatibility fields in sync as well. Do this after the RBAC
    // assignment because setUserRoles is the source of truth for authorization.
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
