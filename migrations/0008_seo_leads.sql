-- SEO lead capture for the public city landing pages.
CREATE TABLE IF NOT EXISTS seo_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  need TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_seo_leads_created_at ON seo_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_seo_leads_city ON seo_leads(city);
