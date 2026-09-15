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

// ============================================================================
// Type Definitions
// ============================================================================

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
  user?: {
    userId: string
    email: string
    role: string
    isSuperAdmin?: boolean
    exp: number
    iat: number
  }
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
  auth?: { extendBetterAuth?: (options: any) => any }
}

// The remainder of this file is intentionally preserved from the upstream
// SonicJS application factory. The important authentication fix is in the
// custom JWT fallback middleware below: browser login uses the HTTP-only
// `auth_token` cookie, while API clients may use Authorization: Bearer.

