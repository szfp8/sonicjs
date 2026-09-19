/** Extra admin settings routes: AI keywords SEO + GEO */
import { adminSettingsRoutes } from '@sonicjs-cms/core';
import { loadAiSeo, loadGeo } from './ai-geo';

const SETTINGS_TYPE = 'site_settings';
const SETTINGS_TENANT = 'default';

async function getStoredSettings(db: D1Database, category: string): Promise<Record<string, any>> {
  try {
    const row = await db
      .prepare(
        `SELECT data FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
      )
      .bind(SETTINGS_TYPE, category, SETTINGS_TENANT)
      .first<{ data?: string }>();
    return row?.data ? JSON.parse(row.data) : {};
  } catch {
    return {};
  }
}

async function saveStoredSettings(db: D1Database, category: string, incoming: Record<string, any>): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const existing = await getStoredSettings(db, category);
    const jsonData = JSON.stringify({ ...existing, ...incoming });
    await db
      .prepare(
        `INSERT OR IGNORE INTO document_types (id, name, display_name, description, schema, source, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(SETTINGS_TYPE, SETTINGS_TYPE, 'Site Settings', 'Global', '{}', 'system', 1, 1, now, now)
      .run();
    const row = await db
      .prepare(
        `SELECT id FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
      )
      .bind(SETTINGS_TYPE, category, SETTINGS_TENANT)
      .first<{ id?: string }>();
    if (row?.id) {
      await db
        .prepare(`UPDATE documents SET data = ?, updated_at = ? WHERE id = ? AND is_current_draft = 1`)
        .bind(jsonData, now, row.id)
        .run();
    } else {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO documents (id, root_id, type_id, version_number, is_current_draft, is_published, status, parent_root_id, slug, title, tenant_id, locale, translation_group_id, data, metadata, created_at, updated_at) VALUES (?, ?, ?, 1, 1, 1, 'published', '', ?, ?, ?, 'default', '', ?, '{}', ?, ?)`,
        )
        .bind(id, id, SETTINGS_TYPE, category, category, SETTINGS_TENANT, jsonData, now, now)
        .run();
    }
    return true;
  } catch (e) {
    console.error('[settings-extra] save failed', e);
    return false;
  }
}

/** Call once at module load to register routes */
export function registerAiGeoSettingsRoutes(): void {
  adminSettingsRoutes.get('/api/ai-seo', async (c) => {
    const data = await loadAiSeo(c.env.DB);
    return c.json({ success: true, data });
  });
  adminSettingsRoutes.post('/api/ai-seo', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const ok = await saveStoredSettings(c.env.DB, 'ai_seo', {
      coreKeywords: String(body.coreKeywords || '').slice(0, 500),
      longTailKeywords: String(body.longTailKeywords || '').slice(0, 2000),
      aiWritingPrompt: String(body.aiWritingPrompt || '').slice(0, 2000),
      injectMetaKeywords: body.injectMetaKeywords !== false,
    });
    return c.json(ok ? { success: true, message: 'AI关键词已保存' } : { success: false, error: '失败' }, ok ? 200 : 500);
  });
  adminSettingsRoutes.get('/api/geo', async (c) => {
    const data = await loadGeo(c.env.DB);
    return c.json({ success: true, data });
  });
  adminSettingsRoutes.post('/api/geo', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const ok = await saveStoredSettings(c.env.DB, 'geo', {
      enabled: body.enabled !== false,
      businessType: String(body.businessType || 'ProfessionalService').slice(0, 80),
      businessName: String(body.businessName || '').slice(0, 120),
      serviceArea: String(body.serviceArea || '').slice(0, 300),
      address: String(body.address || '').slice(0, 300),
      city: String(body.city || '').slice(0, 80),
      region: String(body.region || '').slice(0, 80),
      country: String(body.country || 'CN').slice(0, 8),
      telephone: String(body.telephone || '').slice(0, 40),
      aiSummary: String(body.aiSummary || '').slice(0, 1000),
      faqPairs: String(body.faqPairs || '').slice(0, 4000),
    });
    return c.json(ok ? { success: true, message: 'GEO设置已保存' } : { success: false, error: '失败' }, ok ? 200 : 500);
  });
}

registerAiGeoSettingsRoutes();
