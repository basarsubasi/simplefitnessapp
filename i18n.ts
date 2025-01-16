import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import tr from './locales/tr/translation.json';

const fallbackLng = 'en';
const defaultLocale = Localization.getLocales()[0]?.languageCode || fallbackLng;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: defaultLocale, // Use the language code of the first locale
    fallbackLng, // Fallback to English if no translations are found
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
  });

export default i18n;
