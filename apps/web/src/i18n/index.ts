import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localeDirection, type Locale } from '@ptg/types';
import en from './locales/en.json';
import ar from './locales/ar.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  ja: { translation: ja },
  'zh-CN': { translation: zhCN },
  es: { translation: es },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'ptg-locale' },
  });

/** Applies `dir`/`lang` on <html> and switches i18next in one call - the only place RTL is toggled. */
export function applyLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection(locale);
}

export default i18n;
