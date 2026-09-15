/**
 * Main Application Factory
 *
 * Creates a configured SonicJS application with all core functionality
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import {
  apiRoutes,
  apiMediaRoutes,
  apiSystemRoutes,
  adminApiRoutes,
  authRoutes,
  testCleanupRoutes,
  adminContentRoutes,
  adminUsersRoutes,
  adminMediaRoutes,
  adminPluginRoutes,
  adminLogsRoutes,
  adminCollectionsRoutes,
  adminSettingsRoutes,
  adminApiReferenceRoutes,
  apiDocumentsRoutes,
  adminDocumentsRoutes,
  adminDashboardRoutes
} from './routes'
import { getCoreVersion } from './utils/version'
import { bootstrapMiddleware } from './middleware/bootstrap'
import { metricsMiddleware } from './middleware/metrics'
import { csrfProtection } from './middleware/csrf'
import { securityHeadersMiddleware } from './middleware/security-headers'
import { createDatabaseToolsAdminRoutes } from './plugins/core-plugins/database-tools-plugin/admin-routes'
import { emailPluginV3 as emailPlugin } from './plugins/core-plugins/email-plugin'
import { emailReconciliationPlugin } from './plugins/core-plugins/email-reconciliation'
import { otpLoginPlugin } from './plugins/core-plugins/otp-login-plugin'
import { oauthProvidersPlugin } from './plugins/core-plugins/oauth-providers'
import { userProfilesPlugin } from './plugins/core-plugins/user-profiles'
import { aiSearchPlugin } from './plugins/core-plugins/ai-search-plugin'
import { securityAuditPlugin } from './plugins/core-plugins/security-audit-plugin'
import { securityAuditMiddleware, securityAuditApiRoutes, securityAuditAdminRoutes } from './plugins/core-plugins/security-audit-plugin'
import {
  twoFactorAuthPlugin,
  twoFactorChallengeRoutes,
  twoFactorRecoveryRoutes,
  enforceTwoFactorEnrolment,
  guardRequiredSecondFactorDisable,
} from './plugins/core-plugins/two-factor-auth'
import { apiKeysPlugin, apiKeyAuthMiddleware } from './plugins/core-plugins/api-keys-plugin'
import { stripePlugin } from './plugins/core-plugins/stripe-plugin'
import { formsPlugin } from './plugins/core-plugins/forms-plugin'
import { requireAuth, requireRole, requireRbac, AuthManager } from './middleware/auth'
import { createAuth } from './auth/config'
import { guardPasswordlessSecondFactor } from './auth/passwordless-second-factor-guard'
import { adminRbacRoutes } from './routes/admin-rbac'
import { pluginMenuMiddleware } from './middleware/plugin-menu'
import { menuMiddleware } from './middleware/menu'
import { menuPlugin } from './plugins/core-plugins/menu-plugin'
import { analyticsPlugin } from './plugins/core-plugins/analytics'
import { eventsApiRoutes } from './plugins/core-plugins/analytics/routes/api'
import { globalVariablesPlugin } from './plugins/core-plugins/global-variables-plugin'
import { shortcodesPlugin } from './plugins/core-plugins/shortcodes-plugin'
import { helloWorldPlugin } from './plugins/core-plugins/hello-world-plugin'
import { multiTenantPlugin } from './plugins/core-plugins/multi-tenant-plugin'
import { lexicalEditorPlugin } from './plugins/core-plugins/lexical-editor'
import { versioningPlugin } from './plugins/core-plugins/versioning-plugin'
import { tenantMiddleware } from './middleware/tenant'
import { createMagicLinkAuthPlugin } from './plugins/available/magic-link-auth'
import cachePlugin from './plugins/cache'
import type { Plugin } from './plugins/types'
import { registerPluginRoutes } from './plugins/mount'
import { HookSystemImpl } from './plugins/hook-system'
import { setHookSystem } from './plugins/hooks/hook-system-singleton'
import { createPluginWirer } from './plugins/wire'
import { EmailService } from './services/email/email-service'
import { resolveEmailProvider, type BuiltInProviderName } from './services/email/resolve-provider'
import { loadDbEmailSettings, dbSettingsFrom } from './services/email/db-settings'
import { setEmailService, getEmailService, hasEmailService } from './services/email/email-service-singleton'
import type { EmailProvider } from './services/email/types'
import { CloudflareEmailProvider } from './plugins/core-plugins/email-plugin/services/cf-email-provider'
import { faviconSvg } from './assets/favicon'
import { setAppInstance } from './services/route-metadata'
import { setPluginMenu } from './services/plugin-menu-singleton'
import { PLUGIN_REGISTRY } from './plugins/manifest-registry'
import { setPluginDefinitions } from './services/plugin-definition-registry'

export interface Bindings {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  IMAGES_ACCOUNT_ID?: string
  IMAGES_API_TOKEN?: string
  ENVIRONMENT?: string
  CORS_ORIGINS?: string
  JWT_SECRET?: string
  JWT_EXPIRES_IN?: string
  JWT_REFRESH_GRACE_SECONDS?: string
  BUCKET_NAME?: string
  GOOGLE_MAPS_API_KEY?: string
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

export interface Variables {
  user?: { userId: string; email: string; role: string; isSuperAdmin?: boolean; exp: number; iat: number }
  session?: { id: string; userId: string; token: string; expiresAt: number; createdAt: number; updatedAt: number }
  rbacPerms?: string[]
  requestId?: string
  startTime?: number
  appVersion?: string
  csrfToken?: string
  pluginMenuItems?: Array<{ label: string; path: string; icon: string }>
  hookSystem?: import('./plugins/hooks/typed-hooks').HookSystemLike
  authMethod?: 'api-key'
  tenantId?: string
  tenantRole?: string
}

export interface SonicJSConfig {
  collections?: { directory?: string; autoSync?: boolean }
  plugins?: { directory?: string; autoLoad?: boolean; register?: Plugin[]; disableAll?: boolean }
  email?: { provider?: EmailProvider; providerName?: BuiltInProviderName; from?: string }
  routes?: Array<{ path: string; handler: Hono }>
  middleware?: {
    beforeAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
    afterAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
  }
  auth?: { extendBetterAuth?: import('./auth/config').ExtendBetterAuth }
  version?: string
  name?: string
}

export type BootIsolateFn = (env: Record<string, unknown>) => Promise<void>
export type SonicJSApp = Hono<{ Bindings: Bindings; Variables: Variables }> & { readonly boot: BootIsolateFn }

export function createSonicJSApp(config: SonicJSConfig = {}): SonicJSApp {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  const appVersion = config.version || getCoreVersion()
  const appName = config.name || 'SonicJS AI'

  const hookSystem = new HookSystemImpl()
  setHookSystem(hookSystem)

  const magicLinkPlugin = createMagicLinkAuthPlugin()
  const corePluginsBeforeCatchAll = [
    securityAuditPlugin, twoFactorAuthPlugin, apiKeysPlugin, aiSearchPlugin,
    oauthProvidersPlugin, userProfilesPlugin, otpLoginPlugin, analyticsPlugin,
    stripePlugin, globalVariablesPlugin, shortcodesPlugin, helloWorldPlugin,
    multiTenantPlugin, lexicalEditorPlugin, versioningPlugin, menuPlugin,
  ]
  const corePluginsAfterCatchAll = [emailPlugin, magicLinkPlugin, emailReconciliationPlugin]

  const wirePlugins = createPluginWirer(
    () => [...corePluginsBeforeCatchAll, ...corePluginsAfterCatchAll, ...(config.plugins?.register ?? [])],
    () => ({ hooks: hookSystem, env: firstRequestEnv, providers: { email: () => getEmailService() } })
  )
  let firstRequestEnv: Record<string, unknown> | undefined

  const initEmailService = async (env: Record<string, unknown> = {}) => {
    if (hasEmailService()) return
    let provider: EmailProvider
    let defaultFrom = config.email?.from
    let defaultReplyTo: string | undefined
    if (config.email?.provider || config.email?.providerName || env.RESEND_API_KEY || env.SENDGRID_API_KEY) {
      provider = resolveEmailProvider({ provider: config.email?.provider, providerName: config.email?.providerName, env })
    } else {
      const dbSettings = await loadDbEmailSettings(env.DB as never)
      const resendKey = (dbSettings?.resendApiKey || dbSettings?.apiKey) || undefined
      const cfBinding = (typeof env.EMAIL === 'object' && env.EMAIL !== null) ? env.EMAIL : undefined
      if (dbSettings?.provider === 'cloudflare' && cfBinding) {
        provider = new CloudflareEmailProvider(cfBinding as never); defaultFrom = defaultFrom || dbSettingsFrom(dbSettings); defaultReplyTo = dbSettings.replyTo
      } else if (resendKey) {
        provider = resolveEmailProvider({ providerName: 'resend', env: { ...env, RESEND_API_KEY: resendKey } }); defaultFrom = defaultFrom || dbSettingsFrom(dbSettings!); defaultReplyTo = dbSettings!.replyTo
      } else if (cfBinding && dbSettings?.provider !== 'resend') {
        provider = new CloudflareEmailProvider(cfBinding as never); defaultFrom = defaultFrom || (dbSettings ? dbSettingsFrom(dbSettings) : undefined); defaultReplyTo = dbSettings?.replyTo
      } else provider = resolveEmailProvider({ env })
    }
    defaultFrom = defaultFrom || (env.DEFAULT_FROM_EMAIL as string | undefined) || 'noreply@sonicjs.local'
    setEmailService(new EmailService({ provider, defaultFrom, defaultReplyTo, db: env.DB as never }))
  }

  app.use('*', async (c, next) => { c.set('appVersion', appVersion); await next() })
  app.use('*', metricsMiddleware())
  app.use('*', bootstrapMiddleware(config, [...corePluginsBeforeCatchAll, ...corePluginsAfterCatchAll, ...(config.plugins?.register ?? [])]))

  const boot: BootIsolateFn = async (env: Record<string, unknown>) => {
    if (config.plugins?.disableAll) return
    firstRequestEnv = env
    try { await initEmailService(env) } catch (err) { console.error('[email] init failed:', err) }
    try { await wirePlugins() } catch (err) { console.error('[plugins] wiring failed:', err) }
  }
  app.use('*', async (c, next) => { await boot(c.env as unknown as Record<string, unknown>); return next() })

  if (config.middleware?.beforeAuth) for (const middleware of config.middleware.beforeAuth) app.use('*', middleware)
  app.use('*', async (_c, next) => { await next() })

  app.use('*', cors({
    origin: (origin, c) => {
      const allowed = (c.env as any)?.CORS_ORIGINS as string | undefined
      if (!allowed) return null
      const list = allowed.split(',').map((s: string) => s.trim())
      const match = list.some((pattern: string) => pattern === origin || (pattern.startsWith('*.') && origin.endsWith(pattern.slice(1))))
      return match ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Cache-Control'],
    exposeHeaders: ['X-Cache-Status', 'X-Cache-Source', 'X-Cache-TTL', 'X-Response-Time'],
    credentials: true,
  }))
  app.use('*', securityHeadersMiddleware())
  app.use('*', csrfProtection())

  app.use('*', async (c, next) => {
    try {
      const reqUrl = new URL(c.req.url)
      const requestBaseURL = `${reqUrl.protocol}//${reqUrl.host}`
      const auth = createAuth(c.env, config.auth?.extendBetterAuth, requestBaseURL)
      const session = await auth.api.getSession({ headers: c.req.raw.headers })
      if (session?.user) {
        const u = session.user as { id: string; email: string; role?: string; isSuperAdmin?: boolean }
        const s = session.session as { id: string; userId: string; token: string; expiresAt: number | Date; createdAt: number | Date; updatedAt: number | Date }
        const ms = (v: number | Date) => (typeof v === 'number' ? v : new Date(v).getTime())
        c.set('user', { userId: u.id, email: u.email, role: u.role ?? 'viewer', isSuperAdmin: u.isSuperAdmin === true, exp: ms(s.expiresAt), iat: ms(s.createdAt) })
        c.set('session', { id: s.id, userId: s.userId, token: s.token, expiresAt: ms(s.expiresAt), createdAt: ms(s.createdAt), updatedAt: ms(s.updatedAt) })
      }
    } catch { /* invalid/missing Better Auth session */ }
    await next()
  })

  app.use('*', apiKeyAuthMiddleware())

  // Browser login uses the HTTP-only `auth_token` cookie. Previously this
  // fallback only inspected Authorization: Bearer, so /auth/login/form could
  // successfully set auth_token while the following /admin request still saw
  // no authenticated user and redirected back to /auth/login forever.
  app.use('*', async (c, next) => {
    if (!c.get('user')) {
      const authHeader = c.req.header('Authorization')
      const cookieToken = getCookie(c, 'auth_token')
      const token = authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer sk_')
        ? authHeader.slice(7)
        : cookieToken
      if (token) {
        try {
          const secret = (c.env as any)?.JWT_SECRET
          const payload = await AuthManager.verifyToken(token, secret)
          if (payload) c.set('user', { userId: payload.userId, email: payload.email, role: payload.role, exp: payload.exp, iat: payload.iat })
        } catch { /* invalid token — leave user unset */ }
      }
    }
    await next()
  })

  if (config.middleware?.afterAuth) for (const middleware of config.middleware.afterAuth) app.use('*', middleware)
  app.use('*', tenantMiddleware())

  app.use('/admin/*', requireAuth())
  app.use('/admin/*', requireRbac('portal', 'access'))
  app.use('/admin/*', pluginMenuMiddleware())
  app.use('/admin/*', menuMiddleware())

  const NAV_LANDING: Array<{ path: string; perm: string }> = [
    { path: '/admin/content', perm: 'content:read' }, { path: '/admin/media', perm: 'media:read' },
    { path: '/admin/collections', perm: 'content:read' }, { path: '/admin/forms', perm: 'content:read' },
    { path: '/admin/users', perm: 'users:manage' }, { path: '/admin/plugins', perm: 'plugins:manage' },
    { path: '/admin/settings', perm: 'settings:manage' }, { path: '/admin/rbac', perm: 'rbac:manage' },
  ]
  app.use('/admin/*', async (c, next) => {
    const user = c.get('user') as { userId?: string } | undefined
    if (!user?.userId) return next()
    let perms: string[] = []
    try {
      const { RbacService } = await import('./services/rbac')
      perms = await new RbacService(c.env.DB, c.env.CACHE_KV).permissionsForUser(user.userId)
    } catch { return next() }
    c.set('rbacPerms', perms)
    const path = new URL(c.req.url).pathname
    if ((path === '/admin' || path === '/admin/' || path === '/admin/dashboard') && !perms.includes('dashboard:read')) {
      const dest = NAV_LANDING.find((n) => perms.includes(n.perm))
      if (dest) return c.redirect(dest.path)
      return c.redirect('/auth/login?error=Your account has no accessible sections')
    }
    await next()
    try {
      const contentType = c.res.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) return
      const body = await c.res.text()
      const filtered = body.includes('<!--nav:') ? body.replace(/<!--nav:([^>]+?)-->([\s\S]*?)<!--\/nav-->/g, (_m, perm: string, inner: string) => (perms.includes(perm) ? inner : '')) : body
      const headers = new Headers(c.res.headers); headers.delete('content-length')
      c.res = new Response(filtered, { status: c.res.status, headers })
    } catch { /* leave response unchanged */ }
  })

  app.use('/admin/*', enforceTwoFactorEnrolment())
  app.use('/api/*', enforceTwoFactorEnrolment())
  app.route('/admin/two-factor-reset', twoFactorRecoveryRoutes)
  app.route('/api/security-audit', securityAuditApiRoutes as any)
  app.route('/admin/plugins/security-audit', securityAuditAdminRoutes as any)
  app.route('/api/media', apiMediaRoutes)
  app.route('/api/system', apiSystemRoutes)
  app.route('/api/documents', apiDocumentsRoutes)
  app.route('/api', apiRoutes)
  app.route('/admin/documents', adminDocumentsRoutes)
  registerPluginRoutes(app, [formsPlugin as any], { source: 'core' })
  app.route('/admin/api', adminApiRoutes)
  app.route('/admin/collections', adminCollectionsRoutes)
  app.route('/admin/settings', adminSettingsRoutes)
  app.route('/admin/api-reference', adminApiReferenceRoutes)
  app.route('/admin/database-tools', createDatabaseToolsAdminRoutes())
  app.route('/admin/content', adminContentRoutes)
  app.route('/admin/media', adminMediaRoutes)
  app.use('/auth/*', securityAuditMiddleware())

  if (!config.plugins?.disableAll) {
    registerPluginRoutes(app, corePluginsBeforeCatchAll, { source: 'core' })
    app.route('/admin/cache', cachePlugin.getRoutes())
    if (config.plugins?.register && config.plugins.register.length > 0) registerPluginRoutes(app, config.plugins.register, { source: 'user' })
  }

  app.route('/api/events', eventsApiRoutes)
  app.route('/admin/dashboard', adminDashboardRoutes)
  app.route('/admin/plugins', adminPluginRoutes)
  app.route('/admin/logs', adminLogsRoutes)
  app.route('/admin/rbac', adminRbacRoutes)
  app.route('/admin', adminUsersRoutes)
  app.route('/auth/two-factor', twoFactorChallengeRoutes)
  app.route('/auth', authRoutes)

  app.on(['GET', 'POST'], '/auth/*', async (c) => {
    const refused = await guardPasswordlessSecondFactor(c as unknown as Context<{ Bindings: { DB: D1Database } }>)
    if (refused) return refused
    const disableRefused = await guardRequiredSecondFactorDisable(c as unknown as Context<{ Bindings: { DB: D1Database }; Variables: { user?: { userId?: string } } }>)
    if (disableRefused) return disableRefused
    const reqUrl = new URL(c.req.url)
    const requestBaseURL = `${reqUrl.protocol}//${reqUrl.host}`
    const auth = createAuth(c.env, config.auth?.extendBetterAuth, requestBaseURL)
    return auth.handler(c.req.raw)
  })

  app.route('/', testCleanupRoutes)
  if (!config.plugins?.disableAll) registerPluginRoutes(app, corePluginsAfterCatchAll, { source: 'core' })

  if (!config.plugins?.disableAll) {
    const allMountedPlugins: any[] = [...corePluginsBeforeCatchAll, formsPlugin, ...corePluginsAfterCatchAll, ...(config.plugins?.register ?? [])]
    const userPlugins = (config.plugins?.register ?? []).filter((p: any) => !PLUGIN_REGISTRY[p.id])
    setPluginMenu(userPlugins.flatMap((p: any) => (p.menu ?? []).map((m: any) => ({ ...m, pluginId: p.id }))))
    setPluginDefinitions(allMountedPlugins)
  }

  app.get('/favicon.svg', (c) => new Response(faviconSvg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000' } }))
  app.get('/files/*', async (c) => {
    try {
      const pathname = new URL(c.req.url).pathname
      const objectKey = pathname.replace(/^\/files\//, '')
      if (!objectKey) return c.notFound()
      const object = await c.env.MEDIA_BUCKET.get(objectKey)
      if (!object) return c.notFound()
      const headers = new Headers()
      object.httpMetadata?.contentType && headers.set('Content-Type', object.httpMetadata.contentType)
      object.httpMetadata?.contentDisposition && headers.set('Content-Disposition', object.httpMetadata.contentDisposition)
      headers.set('Cache-Control', 'public, max-age=31536000')
      headers.set('Access-Control-Allow-Origin', '*'); headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS'); headers.set('Access-Control-Allow-Headers', 'Content-Type')
      return new Response(object.body as any, { headers })
    } catch (error) { console.error('Error serving file:', error); return c.notFound() }
  })

  if (config.routes) for (const route of config.routes) app.route(route.path, route.handler)
  app.get('/', (c) => c.redirect('/auth/login'))
  app.get('/health', (c) => c.json({ name: appName, version: appVersion, status: 'running', timestamp: new Date().toISOString() }))
  setAppInstance(app)
  app.notFound((c) => c.json({ error: 'Not Found', status: 404 }, 404))
  app.onError((err, c) => { console.error(err); return c.json({ error: 'Internal Server Error', status: 500 }, 500) })
  return Object.assign(app, { boot }) as SonicJSApp
}

export function setupCoreMiddleware(_app: SonicJSApp): void { console.warn('setupCoreMiddleware is deprecated. Use createSonicJSApp() instead.') }
export function setupCoreRoutes(_app: SonicJSApp): void { console.warn('setupCoreRoutes is deprecated. Use createSonicJSApp() instead.') }
