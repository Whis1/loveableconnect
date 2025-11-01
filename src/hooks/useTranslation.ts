import { useTranslation as useI18nTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useState } from 'react';

// Cache globale persistente per traduzioni (usa sessionStorage)
const getTranslationCache = (): Map<string, string> => {
  if (typeof window === 'undefined') return new Map();
  
  try {
    const cached = sessionStorage.getItem('deepl_translation_cache');
    if (cached) {
      return new Map(JSON.parse(cached));
    }
  } catch (e) {
    console.error('Error loading translation cache:', e);
  }
  return new Map();
};

const saveTranslationCache = (cache: Map<string, string>) => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem('deepl_translation_cache', JSON.stringify(Array.from(cache.entries())));
  } catch (e) {
    console.error('Error saving translation cache:', e);
  }
};

let translationCache = getTranslationCache();

// Mappa inversa per interessi comuni (ottimizzazione)
const INTEREST_REVERSE_MAP: Record<string, string> = {
  // Italian
  'calcio': 'soccer',
  'pallacanestro': 'basketball',
  'pallavolo': 'volleyball',
  'nuoto': 'swimming',
  'corsa': 'running',
  'ciclismo': 'cycling',
  'palestra': 'gym',
  'danza': 'dancing',
  'musica': 'music',
  'lettura': 'reading',
  'viaggi': 'travel',
  'fotografia': 'photography',
  'cucina': 'cooking',
  'arte': 'art',
  'teatro': 'theatre',
  'videogiochi': 'gaming',
  'tecnologia': 'technology',
  'moda': 'fashion',
  'giardinaggio': 'gardening',
  'animali': 'animals',
  'volontariato': 'volunteering',
  'meditazione': 'meditation',
  'escursionismo': 'hiking',
  'campeggio': 'camping',
  'pesca': 'fishing',
  // English
  'soccer': 'soccer',
  'football': 'soccer',
  'basketball': 'basketball',
  'tennis': 'tennis',
  'swimming': 'swimming',
  'running': 'running',
  'gym': 'gym',
  'dance': 'dancing',
  'movies': 'movies',
  'reading': 'reading',
  'travel': 'travel',
  'photography': 'photography',
  'cooking': 'cooking',
  'theater': 'theatre',
  'gaming': 'gaming',
  'technology': 'technology',
  'fashion': 'fashion',
  'gardening': 'gardening',
  'pets': 'animals',
  'volunteering': 'volunteering',
  'hiking': 'hiking',
  'camping': 'camping',
  'fishing': 'fishing',
};

export const useTextTranslation = () => {
  const { i18n, t: originalT } = useI18nTranslation();

  // Normalize language codes like en-US -> en, it-IT -> it
  const normalizeLanguage = (lng?: string) => {
    if (!lng) return 'it';
    const base = lng.toLowerCase().split('-')[0];
    return base;
  };

  const currentLanguage = normalizeLanguage(i18n.language);
  const [, forceUpdate] = useState({});

  // Funzione core per tradurre con DeepL
  const translateWithDeepL = useCallback(async (text: string, targetLang: string): Promise<string> => {
    const cacheKey = `${targetLang}:${text}`;
    
    // Controlla cache
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { 
          text, 
          targetLanguage: targetLang 
        }
      });

      if (error) {
        console.error('DeepL translation error:', error);
        return text;
      }
      
      const translated = data?.translatedText || text;
      translationCache.set(cacheKey, translated);
      saveTranslationCache(translationCache);
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, []);

  // Hook personalizzato t() che traduce tutto automaticamente
  const t = useCallback((key: string, options?: any): string => {
    // Se lingua italiana o araba, usa traduzioni statiche
    if (currentLanguage === 'it') {
      return String(originalT(key, options));
    }

    if (currentLanguage === 'ar') {
      // Arabo usa file JSON statico (DeepL non supporta arabo)
      const arabicTranslation = originalT(key, { ...options, lng: 'ar' });
      const italianFallback = originalT(key, { ...options, lng: 'it' });
      return String(arabicTranslation || italianFallback);
    }

    // Per altre lingue: traduci dal testo italiano con DeepL
    const italianText = String(originalT(key, { ...options, lng: 'it' }));
    
    // Sostituisci interpolazioni nel testo italiano
    let processedText = italianText;
    if (options) {
      Object.keys(options).forEach(optKey => {
        if (optKey !== 'lng') {
          const placeholder = `{{${optKey}}}`;
          const replacement = String(options[optKey]);
          processedText = processedText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        }
      });
    }

    const cacheKey = `${currentLanguage}:${processedText}`;
    
    // Se già tradotto, ritorna subito
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    // Avvia traduzione asincrona e ritorna italiano temporaneamente
    translateWithDeepL(processedText, currentLanguage).then(() => {
      // Forza re-render componente
      forceUpdate({});
    });

    return processedText; // Ritorna italiano temporaneamente
  }, [currentLanguage, originalT, translateWithDeepL]);

  // Funzione per tradurre singolo testo (compatibilità retroattiva)
  const translateText = useCallback(async (text: string | null | undefined): Promise<string> => {
    if (!text || currentLanguage === 'it' || currentLanguage === 'ar') {
      return text || '';
    }
    return translateWithDeepL(text, currentLanguage);
  }, [currentLanguage, translateWithDeepL]);

  // Funzione per tradurre array (per interessi)
  const translateArray = useCallback(async (items: string[] | null | undefined): Promise<string[]> => {
    if (!items || items.length === 0 || currentLanguage === 'it' || currentLanguage === 'ar') {
      return items || [];
    }

    try {
      // Traduci tutti gli items
      const translatedItems = await Promise.all(
        items.map(async (item) => {
          const normalizedItem = item.toLowerCase().trim();
          if (INTEREST_REVERSE_MAP[normalizedItem]) {
            return item; // Interesse noto, mantieni originale
          }
          return translateWithDeepL(item, currentLanguage);
        })
      );

      return translatedItems;
    } catch (error) {
      console.error('Translation error:', error);
      return items;
    }
  }, [currentLanguage, translateWithDeepL]);

  // Funzione per tradurre profili (batch)
  const translateProfiles = useCallback(async (profiles: any[]): Promise<any[]> => {
    if (!profiles || profiles.length === 0 || currentLanguage === 'it' || currentLanguage === 'ar') {
      return profiles;
    }

    try {
      const translated = await Promise.all(
        profiles.map(async (profile) => {
          const [translatedBio, translatedInterests] = await Promise.all([
            profile.bio ? translateWithDeepL(profile.bio, currentLanguage) : null,
            profile.interests ? translateArray(profile.interests) : null
          ]);

          return {
            ...profile,
            translatedBio,
            translatedInterests,
          };
        })
      );

      return translated;
    } catch (error) {
      console.error('Error translating profiles:', error);
      return profiles;
    }
  }, [currentLanguage, translateArray, translateWithDeepL]);

  return {
    t, // Nuovo t() con traduzione automatica DeepL
    translateText,
    translateArray,
    translateProfiles,
    currentLanguage,
    i18n
  };
};

// Hook compatibilità per componenti esistenti che usano solo t()
export const useTranslation = () => {
  const translation = useTextTranslation();
  return {
    t: translation.t,
    i18n: translation.i18n
  };
};
