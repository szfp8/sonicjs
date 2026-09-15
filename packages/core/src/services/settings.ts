export interface GeneralSettings {
  siteName: string
  siteDescription: string
  adminEmail: string
  timezone: string
  language: string
  maintenanceMode: boolean
}

export interface SecuritySettings {
  jwtExpiresIn: string
  jwtRefreshGraceSeconds: number
}

export interface SeoSettings {
  seoTitle: string
  seoKeywords: string
  seoDescription: string
  canonicalUrl: string
  robots: string
  indexNowEnabled: boolean
}

export interface LeadSettings {
  contactPhone: string
  wechat: string
  leadEnabled: boolean
  leadMessage: string
}

const TYPE_ID = 'site_settings'
const TENANT = 'default'

export class SettingsService {
  constructor(private db: D1Database) {}

  /** Get one settings document. */
  private async getSettingsDocument(category: string): Promise<any | null> {
    try {
      const row = await this.db.prepare(`
        SELECT data FROM documents
        WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL
      `).bind(TYPE_ID, category, TENANT).first()

      if (!row) return null
      return JSON.parse((row as any).data)
    } catch (error) {
      console.error(`Error getting settings document for ${category}:`, error)
      return null
    }
  }

  /** Save settings in the existing site_settings/documents storage. No new table or migration. */
  private async saveSettingsDocument(category: string, data: Record<string, any>): Promise<boolean> {
    try {
      const now = Math.floor(Date.now() / 1000)
      const jsonData = JSON.stringify(data)

      await this.db.prepare(`
        INSERT OR IGNORE INTO document_types (id, name, display_name, description, schema, source, is_system, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        TYPE_ID, TYPE_ID, 'Site Settings',
        'Global site configuration settings',
        '{}', 'system', 1, 1, now, now
      ).run()

      const existing = await this.db.prepare(`
        SELECT id FROM documents
        WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL
      `).bind(TYPE_ID, category, TENANT).first() as any

      if (existing) {
        await this.db.prepare(`
          UPDATE documents SET data = ?, updated_at = ?
          WHERE id = ? AND is_current_draft = 1
        `).bind(jsonData, now, existing.id).run()
      } else {
        const docId = crypto.randomUUID()
        const rootId = docId
        const title = category === 'general'
          ? 'General Settings'
          : category === 'security'
            ? 'Security Settings'
            : category === 'seo'
              ? 'SEO Settings'
              : 'Lead Settings'

        await this.db.prepare(`
          INSERT INTO documents (
            id, root_id, type_id, version_number, is_current_draft, is_published, status,
            parent_root_id, slug, title, tenant_id, locale, translation_group_id,
            data, metadata, created_at, updated_at
          ) VALUES (
            ?, ?, ?, 1, 1, 1, 'published',
            '', ?, ?, ?, 'default', '',
            ?, '{}', ?, ?
          )
        `).bind(docId, rootId, TYPE_ID, category, title, TENANT, jsonData, now, now).run()
      }

      return true
    } catch (error) {
      console.error(`Error saving settings document for ${category}:`, error)
      return false
    }
  }

  async getGeneralSettings(userEmail?: string): Promise<GeneralSettings> {
    const settings = await this.getSettingsDocument('general')
    return {
      siteName: settings?.siteName || 'SonicJS AI',
      siteDescription: settings?.siteDescription || 'A modern headless CMS powered by AI',
      adminEmail: settings?.adminEmail || userEmail || 'admin@example.com',
      timezone: settings?.timezone || 'UTC',
      language: settings?.language || 'en',
      maintenanceMode: settings?.maintenanceMode || false
    }
  }

  async saveGeneralSettings(settings: Partial<GeneralSettings>): Promise<boolean> {
    const existing = await this.getSettingsDocument('general')
    return await this.saveSettingsDocument('general', { ...existing, ...settings })
  }

  async getSecuritySettings(): Promise<SecuritySettings> {
    const settings = await this.getSettingsDocument('security')
    return {
      jwtExpiresIn: settings?.jwtExpiresIn || '30d',
      jwtRefreshGraceSeconds: typeof settings?.jwtRefreshGraceSeconds === 'number'
        ? settings.jwtRefreshGraceSeconds
        : 60 * 60 * 24 * 7
    }
  }

  async saveSecuritySettings(settings: Partial<SecuritySettings>): Promise<boolean> {
    const existing = await this.getSettingsDocument('security')
    return await this.saveSettingsDocument('security', { ...existing, ...settings })
  }

  async getSeoSettings(): Promise<SeoSettings> {
    const settings = await this.getSettingsDocument('seo')
    return {
      seoTitle: settings?.seoTitle || '全国财税发票服务｜财税与发票咨询',
      seoKeywords: settings?.seoKeywords || '发票,财税,税务咨询,增值税发票,全国财税服务',
      seoDescription: settings?.seoDescription || '提供合法合规的财税、发票及税务咨询服务信息，覆盖全国城市。',
      canonicalUrl: settings?.canonicalUrl || 'https://szfp8.com',
      robots: settings?.robots || 'index,follow',
      indexNowEnabled: settings?.indexNowEnabled !== false
    }
  }

  async saveSeoSettings(settings: Partial<SeoSettings>): Promise<boolean> {
    const existing = await this.getSettingsDocument('seo')
    return await this.saveSettingsDocument('seo', { ...existing, ...settings })
  }

  async getLeadSettings(): Promise<LeadSettings> {
    const settings = await this.getSettingsDocument('lead')
    return {
      contactPhone: settings?.contactPhone || '',
      wechat: settings?.wechat || '',
      leadEnabled: settings?.leadEnabled !== false,
      leadMessage: settings?.leadMessage || '请通过正规渠道提交真实业务需求，我们将为您提供合法合规的财税服务咨询。'
    }
  }

  async saveLeadSettings(settings: Partial<LeadSettings>): Promise<boolean> {
    const existing = await this.getSettingsDocument('lead')
    return await this.saveSettingsDocument('lead', { ...existing, ...settings })
  }
}
