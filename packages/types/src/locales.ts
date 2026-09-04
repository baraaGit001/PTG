export const SUPPORTED_LOCALES = ['en', 'ar', 'ja', 'zh-CN', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleDescriptor {
  code: Locale;
  /** Name in the language itself, used in the language selector. */
  nativeName: string;
  englishName: string;
  dir: TextDirection;
  /** BCP-47 tag handed to Intl for number/date/currency formatting. */
  intlTag: string;
}

export const LOCALES: Record<Locale, LocaleDescriptor> = {
  en: { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', intlTag: 'en' },
  ar: { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', intlTag: 'ar' },
  ja: { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', intlTag: 'ja' },
  'zh-CN': {
    code: 'zh-CN',
    nativeName: '简体中文',
    englishName: 'Chinese (Simplified)',
    dir: 'ltr',
    intlTag: 'zh-Hans-CN',
  },
  es: { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', intlTag: 'es' },
};

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LIST: LocaleDescriptor[] = Object.values(LOCALES);

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localeDirection(locale: string): TextDirection {
  return isLocale(locale) ? LOCALES[locale].dir : 'ltr';
}

/**
 * Resolves an incoming `Accept-Language` header or stored preference to a
 * supported locale, falling back to the primary subtag before the default.
 */
export function resolveLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const candidates = input
    .split(',')
    .map((part) => part.split(';')[0]?.trim() ?? '')
    .filter(Boolean);

  for (const candidate of candidates) {
    if (isLocale(candidate)) return candidate;
    const lower = candidate.toLowerCase();
    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower);
    if (exact) return exact;
    const primary = lower.split('-')[0];
    const partial = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === primary);
    if (partial) return partial;
  }
  return DEFAULT_LOCALE;
}
