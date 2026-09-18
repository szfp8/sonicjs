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

/**
 * Detect language from URL query, cookie, then Accept-Language.
 */
export function detectLanguage(request: Request): LanguageCode {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get(languageSettings.queryParam)?.toLowerCase().slice(0, 2);
  if (fromQuery && fromQuery in supportedLanguages) {
    return fromQuery as LanguageCode;
  }

  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${languageSettings.cookieName}=([a-z]{2})`));
  if (match?.[1] && match[1] in supportedLanguages) {
    return match[1] as LanguageCode;
  }

  if (languageSettings.autoDetect) {
    const header = request.headers.get('accept-language') || '';
    const languages = header
      .split(',')
      .map((item) => item.split(';')[0].trim().toLowerCase());

    for (const language of languages) {
      const code = language.slice(0, 2) as LanguageCode;
      if (code in supportedLanguages) {
        return code;
      }
    }
  }

  return defaultLanguage;
}

export function languageCookieHeader(lang: LanguageCode): string {
  return `${languageSettings.cookieName}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
