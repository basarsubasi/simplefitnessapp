import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import cs from '../locales/cs/translation.json';
import de from '../locales/de/translation.json';
import dk from '../locales/dk/translation.json';
import el from '../locales/el/translation.json';
import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import fi from '../locales/fi/translation.json';
import fr from '../locales/fr/translation.json';
import it from '../locales/it/translation.json';
import ja from '../locales/ja/translation.json';
import ko from '../locales/ko/translation.json';
import nl from '../locales/nl/translation.json';
import no from '../locales/no/translation.json';
import pl from '../locales/pl/translation.json';
import pt from '../locales/pt/translation.json';
import ro from '../locales/ro/translation.json';
import ru from '../locales/ru/translation.json';
import sl from '../locales/sl/translation.json';
import sv from '../locales/sv/translation.json';
import tr from '../locales/tr/translation.json';
import uk from '../locales/uk/translation.json';
import zh from '../locales/zh/translation.json';


// import more languages here


const fallbackLng = 'en';
const defaultLocale = Localization.getLocales()[0]?.languageCode || fallbackLng;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      cs: { translation: cs },
      de: { translation: de },
      dk: { translation: dk },
     // el: {translation:  el },
      en: { translation: en },
      es: { translation: es },
      fi: { translation: fi },
      fr: { translation: fr },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      nl: { translation: nl },
      no: { translation: no },
      pl: { translation: pl },
      pt: { translation: pt },
      ro: { translation: ro },
      ru: { translation: ru },
      sl: { translation: sl },
      sv: { translation: sv },
      tr: { translation: tr },
      uk: { translation: uk },
      zh: { translation: zh },
      // add more languages here #1
    },
    
    lng: defaultLocale, // Use the language code of the first locale
    fallbackLng, // Fallback to English if no translations are found
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
  });

export default i18n;
