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

/**
 * Detect language from browser/system language.
 * Cloudflare Workers receives Accept-Language from the user browser.
 */
export function detectLanguage(request: Request): LanguageCode {
  const header = request.headers.get('accept-language') || '';
  const languages = header
    .split(',')
    .map(item => item.split(';')[0].trim().toLowerCase());

  for (const language of languages) {
    const code = language.slice(0, 2) as LanguageCode;
    if (code in supportedLanguages) {
      return code;
    }
  }

  return defaultLanguage;
}

export const languageSettings = {
  autoDetect: true,
  allowUserSwitch: true,
  fallback: defaultLanguage,
};
