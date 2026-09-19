/** Shared contact channels: phone / WeChat / QQ / Telegram / WhatsApp */

export type ContactChannels = {
  contactPhone: string;
  wechat: string;
  qq: string;
  telegram: string;
  whatsapp: string;
  leadMessage: string;
  leadEnabled: boolean;
};

const SETTINGS_TYPE = 'site_settings';
const SETTINGS_TENANT = 'default';

export const defaultContacts = (): ContactChannels => ({
  contactPhone: '',
  wechat: '',
  qq: '',
  telegram: '',
  whatsapp: '',
  leadMessage: '请通过正规渠道提交真实业务需求。',
  leadEnabled: true,
});

export async function loadContacts(db?: D1Database): Promise<ContactChannels> {
  const base = defaultContacts();
  if (!db) return base;
  try {
    const row = await db
      .prepare(
        `SELECT data FROM documents WHERE type_id = ? AND slug = ? AND tenant_id = ? AND is_current_draft = 1 AND deleted_at IS NULL`,
      )
      .bind(SETTINGS_TYPE, 'lead', SETTINGS_TENANT)
      .first<{ data?: string }>();
    if (!row?.data) return base;
    const raw = JSON.parse(row.data) as Record<string, unknown>;
    return {
      contactPhone: String(raw.contactPhone || '').slice(0, 80),
      wechat: String(raw.wechat || '').slice(0, 120),
      qq: String(raw.qq || '').slice(0, 40),
      telegram: String(raw.telegram || '').slice(0, 120),
      whatsapp: String(raw.whatsapp || '').slice(0, 40),
      leadMessage: String(raw.leadMessage || base.leadMessage).slice(0, 500),
      leadEnabled: raw.leadEnabled !== false,
    };
  } catch {
    return base;
  }
}

const esc = (v: string) =>
  v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/** Build deep-link / web open URL for each channel */
export function channelHref(kind: keyof ContactChannels, value: string): string {
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  switch (kind) {
    case 'contactPhone':
      return `tel:${v.replace(/\s+/g, '')}`;
    case 'wechat':
      // 手机端尝试拉起微信；桌面打开提示页仍可用复制微信号
      return `weixin://`;
    case 'qq':
      return `mqqwpa://im/chat?chat_type=wpa&uin=${encodeURIComponent(v.replace(/\D/g, ''))}&version=1&src_type=web&web_src=`;
    case 'telegram': {
      const user = v.replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '');
      return `https://t.me/${encodeURIComponent(user)}`;
    }
    case 'whatsapp': {
      const num = v.replace(/\D/g, '');
      return `https://wa.me/${num}`;
    }
    default:
      return '';
  }
}

/** Floating + footer contact bar HTML (no language switcher) */
export function contactBarHtml(c: ContactChannels, phoneFallback = '400-123-4567'): string {
  if (c.leadEnabled === false) return '';
  const phone = c.contactPhone || phoneFallback;
  const items: string[] = [];

  if (phone) {
    items.push(
      `<a class="ct-item" href="${esc(channelHref('contactPhone', phone))}"><span class="ct-ico">☎</span><span>电话</span></a>`,
    );
  }
  if (c.wechat) {
    // 微信号：优先 weixin://，并带 data-copy 方便桌面复制
    items.push(
      `<a class="ct-item" href="${esc(channelHref('wechat', c.wechat))}" data-copy="${esc(c.wechat)}" onclick="try{navigator.clipboard&&navigator.clipboard.writeText(this.getAttribute('data-copy')||'')}catch(e){}"><span class="ct-ico">微</span><span>微信</span></a>`,
    );
  }
  if (c.qq) {
    items.push(
      `<a class="ct-item" href="${esc(channelHref('qq', c.qq))}"><span class="ct-ico">Q</span><span>QQ</span></a>`,
    );
  }
  if (c.telegram) {
    items.push(
      `<a class="ct-item" href="${esc(channelHref('telegram', c.telegram))}" target="_blank" rel="noopener"><span class="ct-ico">TG</span><span>Telegram</span></a>`,
    );
  }
  if (c.whatsapp) {
    items.push(
      `<a class="ct-item" href="${esc(channelHref('whatsapp', c.whatsapp))}" target="_blank" rel="noopener"><span class="ct-ico">WA</span><span>WhatsApp</span></a>`,
    );
  }
  if (!items.length) return '';
  return `<div class="contact-bar" aria-label="联系方式">${items.join('')}</div>`;
}

export const CONTACT_BAR_CSS = `
.contact-bar{position:fixed;right:16px;bottom:80px;z-index:70;display:flex;flex-direction:column;gap:8px}
.ct-item{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:#2563eb;color:#fff!important;font-size:13px;font-weight:700;box-shadow:0 8px 20px rgba(37,99,235,.35);text-decoration:none}
.ct-item:hover{background:#1d4ed8}.ct-ico{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:11px}
@media(max-width:640px){.contact-bar{right:10px;bottom:72px}.ct-item span:last-child{display:none}.ct-item{padding:12px}}
`;
