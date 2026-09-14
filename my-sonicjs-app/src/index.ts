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

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const seoResponse = await handleSeoRequest(request, env as never);
    return seoResponse || app.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Record<string, unknown>, ctx: ExecutionContext) {
    await coreScheduled(controller, env, ctx);
    const siteUrl = String(env.SITE_URL || 'https://example.com');
    await pingIndexNow(new Request(siteUrl), env as never);
  },
};
