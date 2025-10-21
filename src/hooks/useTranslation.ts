import { useState, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const translationCache = new Map<string, string>();

export const useTextTranslation = () => {
  const { i18n } = useI18nTranslation();
  const currentLanguage = i18n.language;

  const translateText = async (text: string | null | undefined): Promise<string> => {
    if (!text) return '';
    
    // If text is already in current language or is very short, return as is
    if (text.length < 3) return text;

    const cacheKey = `${text}_${currentLanguage}`;
    
    // Check cache first
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, targetLanguage: currentLanguage }
      });

      if (error) throw error;

      const translatedText = data.translatedText || text;
      translationCache.set(cacheKey, translatedText);
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  };

  const translateArray = async (items: string[] | null | undefined): Promise<string[]> => {
    if (!items || items.length === 0) return [];
    
    const translations = await Promise.all(
      items.map(item => translateText(item))
    );
    
    return translations;
  };

  // Batch translate profiles for better performance
  const translateProfiles = async (profiles: any[]): Promise<any[]> => {
    const translatedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const [translatedBio, translatedInterests] = await Promise.all([
          profile.bio ? translateText(profile.bio) : null,
          profile.interests ? translateArray(profile.interests) : null
        ]);

        return {
          ...profile,
          translatedBio,
          translatedInterests
        };
      })
    );

    return translatedProfiles;
  };

  return { translateText, translateArray, translateProfiles, currentLanguage };
};
