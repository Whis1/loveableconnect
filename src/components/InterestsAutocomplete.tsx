import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface InterestsAutocompleteProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
  maxInterests?: number;
}

const INTEREST_KEYS = [
  // Sport e Fitness
  "sport",
  "soccer", "tennis", "basketball", "volleyball", "swimming", "running", "cycling",
  "yoga", "pilates", "gym", "fitness", "crossfit", "climbing",
  "surf", "snowboard", "skiing", "skating", "dancing", "martialArts",
  "boxing", "rugby", "golf", "hiking", "trekking",
  
  // Arte e Cultura
  "art", "painting", "drawing", "sculpture", "photography", "cinema",
  "theatre", "music", "concerts", "festivals", "museums", "exhibitions",
  "architecture", "design", "literature", "poetry", "writing",
  "calligraphy", "comics", "manga", "anime",
  
  // Intrattenimento
  "netflix", "tvSeries", "movies", "documentaries", "gaming", "videoGames",
  "playstation", "xbox", "nintendo", "pcGaming", "streaming", "youtube",
  "podcasts", "audiobooks", "karaoke", "escapeRoom", "boardGames",
  
  // Musica
  "rock", "pop", "jazz", "classical", "hipHop", "rap", "reggae",
  "metal", "indie", "electronic", "house", "techno", "blues",
  "folk", "country", "rnb", "soul", "playGuitar", "piano",
  "drums", "dj", "singing",
  
  // Viaggi e Avventura
  "travel", "backpacking", "camping", "adventure", "exploring",
  "roadTrip", "flights", "cruises", "beach", "mountains", "nature",
  "wildlife", "safari", "diving", "snorkeling", "skydiving",
  
  // Cibo e Bevande
  "cooking", "baking", "pastry", "wine", "beer",
  "cocktails", "coffee", "tea", "restaurants", "streetFood", "foodTour",
  "vegan", "vegetarian", "sushi", "pizza", "gourmet", "tastings",
  
  // Lifestyle
  "fashion", "shopping", "makeup", "skincare", "wellness", "meditation",
  "mindfulness", "sustainability", "ecology", "volunteering",
  "charity", "gardening", "plants", "animals", "dogs", "cats",
  "horseRiding", "fishing", "hunting",
  
  // Tecnologia e Scienza
  "technology", "programming", "coding", "ai", "robotics",
  "astronomy", "physics", "chemistry", "biology", "science",
  "innovation", "startups", "crypto", "nft", "vr",
  
  // Sociale e Relazioni
  "socializing", "parties", "nightlife", "clubs", "bars",
  "aperitifs", "brunch", "networking", "events", "community",
  "politics", "activism", "debates",
  
  // Hobby Creativi
  "diy", "modeling", "collecting",
  "antiques", "vintage", "crafts", "crochet", "embroidery",
  "woodworking", "ceramics", "origami", "scrapbooking",
  
  // Benessere Mentale
  "psychology", "philosophy", "spirituality", "astrology",
  "tarot", "personalGrowth", "selfImprovement", "coaching",
  "therapy", "reading", "books", "journalism",
  
  // Auto e Motori
  "cars", "motorcycles", "mechanics", "tuning", "formula1", "motoGP",
  "rally", "karting", "vintageCars",
].sort();

// 🔎 Sinonimi/categorie per la ricerca "smart": se l'utente cerca una di
// queste parole (in italiano, inglese o varianti comuni), vengono proposte
// anche tutte le voci `keys` correlate, anche se il termine non compare nel
// loro nome. Es. "sport" → mostra calcio, palestra, fitness, tennis...
const SEARCH_SYNONYMS: { terms: string[]; keys: string[] }[] = [
  {
    terms: ["sport", "sports", "allenamento", "atletica", "attività fisica"],
    keys: [
      "sport", "soccer", "tennis", "basketball", "volleyball", "swimming",
      "running", "cycling", "yoga", "pilates", "gym", "fitness", "crossfit",
      "climbing", "surf", "snowboard", "skiing", "skating", "boxing", "rugby",
      "golf", "hiking", "trekking", "martialArts", "horseRiding",
    ],
  },
  {
    terms: ["musica", "music", "musicale", "suonare"],
    keys: [
      "music", "rock", "pop", "jazz", "classical", "hipHop", "rap", "reggae",
      "metal", "indie", "electronic", "house", "techno", "blues", "folk",
      "country", "rnb", "soul", "playGuitar", "piano", "drums", "dj",
      "singing", "concerts", "festivals", "karaoke",
    ],
  },
  {
    terms: ["viaggi", "viaggio", "viaggiare", "travel", "vacanze", "vacanza"],
    keys: [
      "travel", "backpacking", "camping", "adventure", "exploring", "roadTrip",
      "flights", "cruises", "beach", "mountains", "nature", "safari", "diving",
      "snorkeling",
    ],
  },
  {
    terms: ["cibo", "food", "mangiare", "cucina", "gastronomia"],
    keys: [
      "cooking", "baking", "pastry", "wine", "beer", "cocktails", "coffee",
      "tea", "restaurants", "streetFood", "foodTour", "vegan", "vegetarian",
      "sushi", "pizza", "gourmet", "tastings",
    ],
  },
  {
    terms: ["arte", "art", "cultura", "culturale"],
    keys: [
      "art", "painting", "drawing", "sculpture", "photography", "cinema",
      "theatre", "museums", "exhibitions", "architecture", "design",
      "literature", "poetry", "writing", "calligraphy",
    ],
  },
  {
    terms: ["giochi", "gaming", "videogiochi", "games", "videogame", "console"],
    keys: [
      "gaming", "videoGames", "playstation", "xbox", "nintendo", "pcGaming",
      "boardGames", "escapeRoom",
    ],
  },
  {
    terms: ["tecnologia", "tech", "technology", "informatica"],
    keys: [
      "technology", "programming", "coding", "ai", "robotics", "innovation",
      "startups", "crypto", "nft", "vr",
    ],
  },
  {
    terms: ["animali", "animal", "pets", "animale"],
    keys: ["animals", "dogs", "cats", "horseRiding", "wildlife"],
  },
  {
    terms: ["motori", "motore", "auto", "macchine", "cars", "motors"],
    keys: [
      "cars", "motorcycles", "mechanics", "tuning", "formula1", "motoGP",
      "rally", "karting", "vintageCars",
    ],
  },
  {
    terms: ["natura", "nature", "outdoor", "aria aperta"],
    keys: [
      "nature", "hiking", "trekking", "camping", "mountains", "beach",
      "gardening", "plants", "fishing", "wildlife",
    ],
  },
];

export function InterestsAutocomplete({
  selectedInterests,
  onInterestsChange,
  maxInterests = 4,
}: InterestsAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [filteredInterests, setFilteredInterests] = useState<string[]>([]);

  // Get translated interests list — useMemo per stabilizzare la reference.
  // PRIMA era un .map() inline, ricreato ad ogni render. Essendo nelle
  // dipendenze del useEffect sotto, faceva girare l'effetto in loop infinito
  // (setState → re-render → nuovo array → effect → setState → ...): la CPU
  // restava al 100% e il PC si surriscaldava quando si entrava nel form di
  // modifica profilo.
  const translatedInterests = useMemo(
    () =>
      INTEREST_KEYS.map((key) => ({
        key,
        label: t(`interests.${key}`, key), // fallback to key if translation missing
      })),
    // Si rigenera solo se cambia la lingua (cambia la funzione t).
    [t]
  );

  useEffect(() => {
    if (inputValue.trim()) {
      const q = inputValue.toLowerCase().trim();

      // 🔎 Ricerca "smart": oltre al match diretto sul nome, alcune parole
      // generiche/categorie (es. "sport") fanno comparire anche le voci
      // correlate (calcio, palestra, fitness...). Le chiavi sono confrontate
      // sia in IT che con sinonimi comuni, così "sport"/"musica"/"viaggi"
      // propongono tutto il gruppo anche se la parola non è nel nome.
      const matchedKeys = SEARCH_SYNONYMS
        .filter((g) => g.terms.some((term) => term.includes(q) || q.includes(term)))
        .flatMap((g) => g.keys);
      const matchedKeySet = new Set(matchedKeys);

      const filtered = translatedInterests.filter(
        (interest) =>
          !selectedInterests.includes(interest.label) &&
          (interest.label.toLowerCase().includes(q) || matchedKeySet.has(interest.key))
      );
      setFilteredInterests(filtered.map((i) => i.label));
    } else {
      setFilteredInterests([]);
    }
  }, [inputValue, selectedInterests, translatedInterests]);

  const handleSelectInterest = (interest: string) => {
    if (selectedInterests.length < maxInterests && !selectedInterests.includes(interest)) {
      onInterestsChange([...selectedInterests, interest]);
      setInputValue("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    onInterestsChange(selectedInterests.filter((i) => i !== interest));
  };

  return (
    <div className="space-y-3">
      {/* Selected Interests */}
      {selectedInterests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedInterests.map((interest) => (
            <Badge
              key={interest}
              variant="secondary"
              className="text-sm py-1 px-3 cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              {interest}
              <button
                type="button"
                onClick={() => handleRemoveInterest(interest)}
                className="ml-2 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Autocomplete Input */}
      {selectedInterests.length < maxInterests && (
        <Command className="border rounded-lg">
          <CommandInput
            placeholder={`${t('common.searchInterests')} (${selectedInterests.length}/${maxInterests})`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          {/* 📜 Lista scrollabile: mostra TUTTI i risultati (non più solo 10),
              scorrendo se sono tanti. max-h limita l'altezza così non invade
              tutto il dialog. */}
          <CommandList className="max-h-60 overflow-y-auto">
            {inputValue.trim() && filteredInterests.length === 0 && (
              <CommandEmpty>{t('common.noInterestsFound')}</CommandEmpty>
            )}
            {inputValue.trim() && filteredInterests.length > 0 && (
              <CommandGroup heading={t('common.selectAnInterest')}>
                {filteredInterests.map((interest) => (
                  <CommandItem
                    key={interest}
                    onSelect={() => handleSelectInterest(interest)}
                    className="cursor-pointer"
                  >
                    {interest}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      )}

      {selectedInterests.length >= maxInterests && (
        <p className="text-sm text-muted-foreground">
          {t('common.interestLimitReached', { max: maxInterests })}
        </p>
      )}
    </div>
  );
}
