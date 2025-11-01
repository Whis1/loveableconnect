import { useState, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const translationCache = new Map<string, string>();

// Reverse mapping for interests from any language back to keys
const INTEREST_REVERSE_MAP: Record<string, string> = {
  // English
  'soccer': 'soccer', 'football': 'soccer', 'tennis': 'tennis', 'basketball': 'basketball',
  'volleyball': 'volleyball', 'swimming': 'swimming', 'running': 'running',
  'cycling': 'cycling', 'yoga': 'yoga', 'pilates': 'pilates', 'gym': 'gym',
  'fitness': 'fitness', 'crossfit': 'crossfit', 'climbing': 'climbing',
  'surf': 'surf', 'surfing': 'surf', 'snowboard': 'snowboard', 'skiing': 'skiing',
  'skating': 'skating', 'dancing': 'dancing', 'dance': 'dancing',
  'martial arts': 'martialArts', 'boxing': 'boxing', 'rugby': 'rugby',
  'golf': 'golf', 'hiking': 'hiking', 'trekking': 'trekking', 'art': 'art',
  'painting': 'painting', 'drawing': 'drawing', 'sculpture': 'sculpture',
  'photography': 'photography', 'cinema': 'cinema', 'movies': 'movies',
  'theatre': 'theatre', 'theater': 'theatre', 'music': 'music',
  'concerts': 'concerts', 'festivals': 'festivals', 'museums': 'museums',
  'exhibitions': 'exhibitions', 'architecture': 'architecture', 'design': 'design',
  'literature': 'literature', 'poetry': 'poetry', 'writing': 'writing',
  'calligraphy': 'calligraphy', 'comics': 'comics', 'manga': 'manga',
  'anime': 'anime', 'netflix': 'netflix', 'tv series': 'tvSeries',
  'documentaries': 'documentaries', 'gaming': 'gaming', 'video games': 'videoGames',
  'playstation': 'playstation', 'xbox': 'xbox', 'nintendo': 'nintendo',
  'pc gaming': 'pcGaming', 'streaming': 'streaming', 'youtube': 'youtube',
  'podcasts': 'podcasts', 'audiobooks': 'audiobooks', 'karaoke': 'karaoke',
  'escape room': 'escapeRoom', 'board games': 'boardGames',
  'rock': 'rock', 'pop': 'pop', 'jazz': 'jazz', 'classical': 'classical',
  'hip hop': 'hipHop', 'rap': 'rap', 'reggae': 'reggae', 'metal': 'metal',
  'indie': 'indie', 'electronic': 'electronic', 'house': 'house',
  'techno': 'techno', 'blues': 'blues', 'folk': 'folk', 'country': 'country',
  'r&b': 'rnb', 'soul': 'soul', 'play guitar': 'playGuitar', 'guitar': 'playGuitar',
  'piano': 'piano', 'drums': 'drums', 'dj': 'dj', 'singing': 'singing',
  'travel': 'travel', 'backpacking': 'backpacking', 'camping': 'camping',
  'adventure': 'adventure', 'exploring': 'exploring', 'road trip': 'roadTrip',
  'flights': 'flights', 'cruises': 'cruises', 'beach': 'beach',
  'mountains': 'mountains', 'nature': 'nature', 'wildlife': 'wildlife',
  'safari': 'safari', 'diving': 'diving', 'snorkeling': 'snorkeling',
  'skydiving': 'skydiving', 'cooking': 'cooking', 'baking': 'baking',
  'pastry': 'pastry', 'wine': 'wine', 'beer': 'beer', 'cocktails': 'cocktails',
  'coffee': 'coffee', 'tea': 'tea', 'restaurants': 'restaurants',
  'street food': 'streetFood', 'food tour': 'foodTour', 'vegan': 'vegan',
  'vegetarian': 'vegetarian', 'sushi': 'sushi', 'pizza': 'pizza',
  'gourmet': 'gourmet', 'tastings': 'tastings', 'fashion': 'fashion',
  'shopping': 'shopping', 'makeup': 'makeup', 'make-up': 'makeup',
  'skincare': 'skincare', 'wellness': 'wellness', 'meditation': 'meditation',
  'mindfulness': 'mindfulness', 'sustainability': 'sustainability',
  'ecology': 'ecology', 'volunteering': 'volunteering', 'charity': 'charity',
  'gardening': 'gardening', 'plants': 'plants', 'animals': 'animals',
  'dogs': 'dogs', 'cats': 'cats', 'horse riding': 'horseRiding',
  'fishing': 'fishing', 'hunting': 'hunting', 'technology': 'technology',
  'programming': 'programming', 'coding': 'coding', 'ai': 'ai',
  'robotics': 'robotics', 'astronomy': 'astronomy', 'physics': 'physics',
  'chemistry': 'chemistry', 'biology': 'biology', 'science': 'science',
  'innovation': 'innovation', 'startups': 'startups', 'crypto': 'crypto',
  'nft': 'nft', 'virtual reality': 'vr', 'vr': 'vr', 'socializing': 'socializing',
  'parties': 'parties', 'nightlife': 'nightlife', 'clubs': 'clubs',
  'bars': 'bars', 'aperitifs': 'aperitifs', 'brunch': 'brunch',
  'networking': 'networking', 'events': 'events', 'community': 'community',
  'politics': 'politics', 'activism': 'activism', 'debates': 'debates',
  'diy': 'diy', 'modeling': 'modeling', 'collecting': 'collecting',
  'antiques': 'antiques', 'vintage': 'vintage', 'crafts': 'crafts',
  'crochet': 'crochet', 'embroidery': 'embroidery', 'woodworking': 'woodworking',
  'ceramics': 'ceramics', 'origami': 'origami', 'scrapbooking': 'scrapbooking',
  'psychology': 'psychology', 'philosophy': 'philosophy',
  'spirituality': 'spirituality', 'astrology': 'astrology', 'tarot': 'tarot',
  'personal growth': 'personalGrowth', 'self-improvement': 'selfImprovement',
  'coaching': 'coaching', 'therapy': 'therapy', 'reading': 'reading',
  'books': 'books', 'journalism': 'journalism', 'cars': 'cars',
  'motorcycles': 'motorcycles', 'mechanics': 'mechanics', 'tuning': 'tuning',
  'formula 1': 'formula1', 'motogp': 'motoGP', 'rally': 'rally', 'karting': 'karting', 'vintage cars': 'vintageCars',
  
  // Italian
  'calcio': 'soccer', 'basket': 'basketball', 'pallavolo': 'volleyball',
  'nuoto': 'swimming', 'corsa': 'running', 'ciclismo': 'cycling',
  'palestra': 'gym', 'arrampicata': 'climbing', 'sci': 'skiing',
  'pattinaggio': 'skating', 'danza': 'dancing', 'arti marziali': 'martialArts',
  'boxe': 'boxing', 'escursionismo': 'hiking',
  'pittura': 'painting', 'disegno': 'drawing',
  'scultura': 'sculpture', 'fotografia': 'photography',
  'teatro': 'theatre', 'musica': 'music', 'concerti': 'concerts', 'festival': 'festivals',
  'musei': 'museums', 'mostre': 'exhibitions', 'architettura': 'architecture',
  'letteratura': 'literature', 'poesia': 'poetry',
  'scrittura': 'writing', 'calligrafia': 'calligraphy', 'fumetti': 'comics',
  'serie tv': 'tvSeries', 'film': 'movies', 'documentari': 'documentaries',
  'videogiochi': 'videoGames', 'audiolibri': 'audiobooks',
  'classica': 'classical', 'elettronica': 'electronic',
  'suonare chitarra': 'playGuitar', 'pianoforte': 'piano',
  'batteria': 'drums', 'canto': 'singing', 'viaggi': 'travel',
  'campeggio': 'camping', 'avventura': 'adventure',
  'esplorare': 'exploring', 'voli': 'flights',
  'crociere': 'cruises', 'spiaggia': 'beach', 'montagna': 'mountains',
  'natura': 'nature', 'immersioni': 'diving', 'paracadutismo': 'skydiving',
  'cucina': 'cooking', 'cucinare': 'cooking',
  'pasticceria': 'pastry', 'vino': 'wine', 'birra': 'beer', 'cocktail': 'cocktails',
  'caffè': 'coffee', 'tè': 'tea', 'ristoranti': 'restaurants',
  'vegano': 'vegan', 'vegetariano': 'vegetarian',
  'degustazioni': 'tastings', 'moda': 'fashion',
  'meditazione': 'meditation', 'sostenibilità': 'sustainability', 'ecologia': 'ecology',
  'volontariato': 'volunteering', 'beneficenza': 'charity',
  'giardinaggio': 'gardening', 'piante': 'plants', 'animali': 'animals',
  'cani': 'dogs', 'gatti': 'cats', 'equitazione': 'horseRiding',
  'pesca': 'fishing', 'caccia': 'hunting', 'tecnologia': 'technology',
  'programmazione': 'programming', 'ia': 'ai',
  'robotica': 'robotics', 'astronomia': 'astronomy', 'fisica': 'physics',
  'chimica': 'chemistry', 'biologia': 'biology', 'scienza': 'science',
  'innovazione': 'innovation', 'startup': 'startups', 'realtà virtuale': 'vr',
  'socializzare': 'socializing', 'feste': 'parties', 'discoteche': 'clubs',
  'bar': 'bars', 'aperitivi': 'aperitifs', 'eventi': 'events',
  'politica': 'politics', 'attivismo': 'activism', 'dibattiti': 'debates',
  'bricolage': 'diy', 'fai da te': 'diy', 'modellismo': 'modeling',
  'collezionismo': 'collecting', 'antiquariato': 'antiques', 'artigianato': 'crafts',
  'uncinetto': 'crochet', 'ricamo': 'embroidery',
  'lavorazione legno': 'woodworking', 'ceramica': 'ceramics',
  'psicologia': 'psychology', 'filosofia': 'philosophy',
  'spiritualità': 'spirituality', 'astrologia': 'astrology', 'tarocchi': 'tarot',
  'crescita personale': 'personalGrowth', 'lettura': 'reading', 'libri': 'books',
  'giornalismo': 'journalism', 'auto': 'cars', 'moto': 'motorcycles',
  'meccanica': 'mechanics', "auto d'epoca": 'vintageCars',
};

export const useTextTranslation = () => {
  const { i18n, t } = useI18nTranslation();
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
    
    // Try to translate interests using the reverse map first
    const translations = items.map(item => {
      const normalized = item.toLowerCase().trim();
      const key = INTEREST_REVERSE_MAP[normalized];
      if (key) {
        return t(`interests.${key}`, item);
      }
      return item;
    });
    
    // If no translations found via map, fallback to API translation
    const hasUntranslated = translations.some((trans, idx) => trans === items[idx]);
    if (hasUntranslated) {
      const apiTranslations = await Promise.all(
        items.map((item, idx) => {
          if (translations[idx] === item) {
            return translateText(item);
          }
          return Promise.resolve(translations[idx]);
        })
      );
      return apiTranslations;
    }
    
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
