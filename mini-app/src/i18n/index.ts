/**
 * Internationalization Configuration
 * ===================================
 * i18next setup with language detection and lazy loading.
 *
 * Default language: Russian (ru)
 * Fallback: Russian
 *
 * Language detection priority:
 * 1. Telegram WebApp language_code
 * 2. localStorage
 * 3. Browser language
 *
 * @module @sleepcore/mini-app/i18n
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import en from './locales/en.json';

// Get Telegram language if available
const getTelegramLanguage = (): string | undefined => {
  try {
    const webApp = (window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } } }).Telegram?.WebApp;
    return webApp?.initDataUnsafe?.user?.language_code;
  } catch {
    return undefined;
  }
};

// Custom language detector for Telegram
const telegramLanguageDetector = {
  name: 'telegram',
  lookup: () => getTelegramLanguage(),
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'en'],

    // Language detection options
    detection: {
      order: ['telegram', 'localStorage', 'navigator'],
      lookupLocalStorage: 'sleepcore_language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Development options
    debug: import.meta.env.DEV,
  });

// Register custom Telegram detector
i18n.services.languageDetector.addDetector(telegramLanguageDetector);

export default i18n;

// Re-export useful hooks
export { useTranslation } from 'react-i18next';
