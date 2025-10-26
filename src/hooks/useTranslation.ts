import { useState, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const translationCache = new Map<string, string>();

// Reverse mapping for interests from any language back to keys
const INTEREST_REVERSE_MAP: Record<string, string> = {
  // Italian
  'calcio': 'soccer', 'tennis': 'tennis', 'basket': 'basketball', 'pallavolo': 'volleyball',
  'nuoto': 'swimming', 'corsa': 'running', 'ciclismo': 'cycling', 'yoga': 'yoga',
  'pilates': 'pilates', 'palestra': 'gym', 'fitness': 'fitness', 'crossfit': 'crossfit',
  'arrampicata': 'climbing', 'surf': 'surf', 'snowboard': 'snowboard', 'sci': 'skiing',
  'pattinaggio': 'skating', 'danza': 'dancing', 'arti marziali': 'martialArts',
  'boxe': 'boxing', 'rugby': 'rugby', 'golf': 'golf', 'escursionismo': 'hiking',
  'trekking': 'trekking', 'arte': 'art', 'pittura': 'painting', 'disegno': 'drawing',
  'scultura': 'sculpture', 'fotografia': 'photography', 'cinema': 'cinema',
  'teatro': 'theatre', 'musica': 'music', 'concerti': 'concerts', 'festival': 'festivals',
  'musei': 'museums', 'mostre': 'exhibitions', 'architettura': 'architecture',
  'design': 'design', 'letteratura': 'literature', 'poesia': 'poetry',
  'scrittura': 'writing', 'calligrafia': 'calligraphy', 'fumetti': 'comics',
  'manga': 'manga', 'anime': 'anime', 'netflix': 'netflix', 'serie tv': 'tvSeries',
  'film': 'movies', 'documentari': 'documentaries', 'gaming': 'gaming',
  'videogiochi': 'videoGames', 'playstation': 'playstation', 'xbox': 'xbox',
  'nintendo': 'nintendo', 'pc gaming': 'pcGaming', 'streaming': 'streaming',
  'youtube': 'youtube', 'podcast': 'podcasts', 'audiolibri': 'audiobooks',
  'karaoke': 'karaoke', 'escape room': 'escapeRoom', 'board games': 'boardGames',
  'rock': 'rock', 'pop': 'pop', 'jazz': 'jazz', 'classica': 'classical',
  'hip hop': 'hipHop', 'rap': 'rap', 'reggae': 'reggae', 'metal': 'metal',
  'indie': 'indie', 'elettronica': 'electronic', 'house': 'house', 'techno': 'techno',
  'blues': 'blues', 'folk': 'folk', 'country': 'country', 'r&b': 'rnb',
  'soul': 'soul', 'suonare chitarra': 'playGuitar', 'pianoforte': 'piano',
  'batteria': 'drums', 'dj': 'dj', 'canto': 'singing', 'viaggi': 'travel',
  'backpacking': 'backpacking', 'campeggio': 'camping', 'avventura': 'adventure',
  'esplorare': 'exploring', 'road trip': 'roadTrip', 'voli': 'flights',
  'crociere': 'cruises', 'spiaggia': 'beach', 'montagna': 'mountains',
  'natura': 'nature', 'wildlife': 'wildlife', 'safari': 'safari',
  'immersioni': 'diving', 'snorkeling': 'snorkeling', 'paracadutismo': 'skydiving',
  'cucina': 'cooking', 'cucinare': 'cooking', 'baking': 'baking',
  'pasticceria': 'pastry', 'vino': 'wine', 'birra': 'beer', 'cocktail': 'cocktails',
  'caffè': 'coffee', 'tè': 'tea', 'ristoranti': 'restaurants',
  'street food': 'streetFood', 'food tour': 'foodTour', 'vegano': 'vegan',
  'vegetariano': 'vegetarian', 'sushi': 'sushi', 'pizza': 'pizza',
  'gourmet': 'gourmet', 'degustazioni': 'tastings', 'moda': 'fashion',
  'shopping': 'shopping', 'make-up': 'makeup', 'skincare': 'skincare',
  'wellness': 'wellness', 'meditazione': 'meditation', 'mindfulness': 'mindfulness',
  'sostenibilità': 'sustainability', 'ecologia': 'ecology',
  'volontariato': 'volunteering', 'beneficenza': 'charity',
  'giardinaggio': 'gardening', 'piante': 'plants', 'animali': 'animals',
  'cani': 'dogs', 'gatti': 'cats', 'equitazione': 'horseRiding',
  'pesca': 'fishing', 'caccia': 'hunting', 'tecnologia': 'technology',
  'programmazione': 'programming', 'coding': 'coding', 'ia': 'ai',
  'robotica': 'robotics', 'astronomia': 'astronomy', 'fisica': 'physics',
  'chimica': 'chemistry', 'biologia': 'biology', 'scienza': 'science',
  'innovazione': 'innovation', 'startup': 'startups', 'crypto': 'crypto',
  'nft': 'nft', 'realtà virtuale': 'vr', 'socializzare': 'socializing',
  'feste': 'parties', 'nightlife': 'nightlife', 'discoteche': 'clubs',
  'bar': 'bars', 'aperitivi': 'aperitifs', 'brunch': 'brunch',
  'networking': 'networking', 'eventi': 'events', 'community': 'community',
  'politica': 'politics', 'attivismo': 'activism', 'dibattiti': 'debates',
  'bricolage': 'diy', 'fai da te': 'diy', 'modellismo': 'modeling',
  'collezionismo': 'collecting', 'antiquariato': 'antiques', 'vintage': 'vintage',
  'artigianato': 'crafts', 'uncinetto': 'crochet', 'ricamo': 'embroidery',
  'lavorazione legno': 'woodworking', 'ceramica': 'ceramics', 'origami': 'origami',
  'scrapbooking': 'scrapbooking', 'psicologia': 'psychology',
  'filosofia': 'philosophy', 'spiritualità': 'spirituality',
  'astrologia': 'astrology', 'tarocchi': 'tarot', 'crescita personale': 'personalGrowth',
  'self-improvement': 'selfImprovement', 'coaching': 'coaching',
  'terapia': 'therapy', 'lettura': 'reading', 'libri': 'books',
  'giornalismo': 'journalism', 'auto': 'cars', 'moto': 'motorcycles',
  'meccanica': 'mechanics', 'tuning': 'tuning', 'formula 1': 'formula1',
  'motogp': 'motoGP', 'rally': 'rally', 'karting': 'karting',
  "auto d'epoca": 'vintageCars',
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

    // Skip translation - just return original text to avoid API overload
    // Translation feature disabled to improve performance
    return text;
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
