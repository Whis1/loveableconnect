import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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

// Per chi avesse una lingua diversa salvata in localStorage da una visita
// precedente: la sovrascriviamo a 'it' al volo, cosi' la pagina parte
// sempre in italiano finche' il selettore lingua resta nascosto.
try {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('i18nextLng', 'it');
  }
} catch {
  /* localStorage non disponibile: ignora */
}

i18n
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
    // Lingua forzata a italiano finche' il LanguageSwitcher e' nascosto.
    // Per riabilitare il multi-lingua: rimetti LanguageDetector e togli
    // il blocco localStorage qui sopra.
    lng: 'it',
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;