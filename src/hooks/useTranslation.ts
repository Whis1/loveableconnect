import { useState, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/async';

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
  const { i18n } = useI18nTranslation();
  // Mantenuta solo per retrocompatibilità: il sito è ufficialmente IT-only.
  const currentLanguage = i18n.language || 'it';

  // 🚫 TRADUZIONI DINAMICHE DISABILITATE (definitivamente, da decisione utente).
  //
  // Motivazione: il sito è italiano nativo, i profili e gli interessi sono
  // già in italiano. Le chiamate all'Edge Function `translate-text` (anche
  // solo IT→IT) saturavano il connection pool del browser (max 6 connessioni
  // HTTP concorrenti) e facevano timeoutare TUTTE le altre query: crediti,
  // profilo, like. Causa principale del "Caricamento infinito".
  //
  // Le label UI restano tradotte tramite i18next + file `it.json` (lookup
  // sincrono in memoria, zero chiamate API, zero impatto sulle performance).
  //
  // translateText, translateArray, translateProfiles sono ora NOOP che ritornano
  // il testo originale immediatamente — niente più Edge Function calls.

  const translateText = async (text: string | null | undefined): Promise<string> => {
    return text || '';
  };

  const translateArray = async (items: string[] | null | undefined): Promise<string[]> => {
    return items || [];
  };

  // Batch translate profiles: NOOP — ritorna i profili così come sono.
  const translateProfiles = async (profiles: any[]): Promise<any[]> => {
    const translatedProfiles = profiles.map((profile) => ({
      ...profile,
      translatedBio: null,
      translatedInterests: null,
    }));

    return translatedProfiles;
  };

  return { translateText, translateArray, translateProfiles, currentLanguage };
};
