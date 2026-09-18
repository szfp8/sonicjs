export const supportedLanguages = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
} as const;

export type LanguageCode = keyof typeof supportedLanguages;

export const defaultLanguage: LanguageCode = 'zh';

export const languageSettings = {
  autoDetect: true,
  allowUserSwitch: true,
  fallback: defaultLanguage,
  cookieName: 'lang',
  queryParam: 'lang',
};

function isLanguageCode(value: string): value is LanguageCode {
  return value in supportedLanguages;
}

/**
 * Detect language from URL query, cookie, then Accept-Language.
 */
export function detectLanguage(request: Request): LanguageCode {
  try {
    const url = new URL(request.url);
    const fromQuery = (url.searchParams.get(languageSettings.queryParam) || '')
      .toLowerCase()
      .slice(0, 2);
    if (fromQuery && isLanguageCode(fromQuery)) {
      return fromQuery;
    }

    const cookie = request.headers.get('cookie') || '';
    const parts = cookie.split(';');
    for (const part of parts) {
      const [rawKey, ...rest] = part.trim().split('=');
      if (rawKey === languageSettings.cookieName) {
        const value = (rest.join('=') || '').toLowerCase().slice(0, 2);
        if (isLanguageCode(value)) return value;
      }
    }

    if (languageSettings.autoDetect) {
      const header = request.headers.get('accept-language') || '';
      const languages = header
        .split(',')
        .map((item) => item.split(';')[0].trim().toLowerCase());

      for (const language of languages) {
        const code = language.slice(0, 2);
        if (isLanguageCode(code)) return code;
      }
    }
  } catch {
    /* ignore and fall back */
  }

  return defaultLanguage;
}

export function languageCookieHeader(lang: LanguageCode): string {
  return `${languageSettings.cookieName}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
