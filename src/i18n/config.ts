import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import it from './locales/it.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

import interestsEn from './locales/interests_en.json';
import interestsIt from './locales/interests_it.json';
import interestsDe from './locales/interests_de.json';
import interestsEs from './locales/interests_es.json';
import interestsFr from './locales/interests_fr.json';
import interestsAr from './locales/interests_ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, ...interestsEn } },
      it: { translation: { ...it, ...interestsIt } },
      de: { translation: { ...de, ...interestsDe } },
      es: { translation: { ...es, ...interestsEs } },
      fr: { translation: { ...fr, ...interestsFr } },
      ar: { translation: { ...ar, ...interestsAr } },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;