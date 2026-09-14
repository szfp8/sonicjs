/**
 * My SonicJS Application — production SEO build.
 *
 * The SonicJS admin/API remains the backend. The SEO layer adds a lightweight
 * public website, 314 city landing pages, sitemap/robots, lead capture, and
 * optional IndexNow notifications without changing the existing CMS auth.
 */

import type { SonicJSConfig } from '@sonicjs-cms/core';
import {
  collectCronSchedules,
  createScheduledHandler,
  createSonicJSApp,
  demoLoginPlugin,
  emailReconciliationPlugin,
  getHookSystem,
  graphqlPlugin,
  mcpPlugin,
  redirectPlugin,
  registerCollections,
  versioningPlugin,
} from '@sonicjs-cms/core';
import { examplePlugin } from './plugins/example';
import { moodsCollection } from './plugins/example/collections/moods.collection';
import './user-profile.model';

import { siteSettingsCollection } from '@sonicjs-cms/core';
import blogPostsCollection from './collections/blog-posts.collection';
import e2eTestCollection from './collections/e2e-test.collection';
import { departmentsCollection } from './collections/departments.collection';
import { regionsCollection } from './collections/regions.collection';
import { employeesCollection } from './collections/employees.collection';
import { faqCollection } from './collections/faq.collection';
import { handleSeoRequest, pingIndexNow } from './seo/public';

registerCollections([
  siteSettingsCollection,
  blogPostsCollection,
  e2eTestCollection,
  moodsCollection,
  departmentsCollection,
  regionsCollection,
  employeesCollection,
  faqCollection,
]);

const config: SonicJSConfig = {
  plugins: {
    register: [redirectPlugin, examplePlugin, mcpPlugin(), graphqlPlugin(), demoLoginPlugin, versioningPlugin],
    disableAll: false,
  },
};

const app = createSonicJSApp(config);
const allCronPlugins = [emailReconciliationPlugin, ...(config.plugins?.register ?? [])];
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
