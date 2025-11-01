import { useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';

export const useLanguageDetection = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const detectAndSetLanguage = async () => {
      // Check if language is already set in localStorage
      const storedLanguage = localStorage.getItem('i18nextLng');
      if (storedLanguage) {
        // User has already chosen a language
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('detect-language');

        if (error) {
          console.error('Error detecting language:', error);
          return;
        }

        if (data?.language) {
          console.log('Auto-detected language:', data.language, 'from country:', data.country);
          await i18n.changeLanguage(data.language);
        }
      } catch (error) {
        console.error('Failed to detect language:', error);
      }
    };

    detectAndSetLanguage();
  }, [i18n]);
};