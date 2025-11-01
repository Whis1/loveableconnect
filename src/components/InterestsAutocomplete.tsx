import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
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

export function InterestsAutocomplete({
  selectedInterests,
  onInterestsChange,
  maxInterests = 4,
}: InterestsAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [filteredInterests, setFilteredInterests] = useState<string[]>([]);

  // Get translated interests list
  const translatedInterests = INTEREST_KEYS.map(key => ({
    key,
    label: t(`interests.${key}`, key) // fallback to key if translation missing
  }));

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = translatedInterests.filter(
        (interest) =>
          interest.label.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedInterests.includes(interest.label)
      );
      setFilteredInterests(filtered.map(i => i.label));
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
          <CommandList>
            {inputValue.trim() && filteredInterests.length === 0 && (
              <CommandEmpty>{t('common.noInterestsFound')}</CommandEmpty>
            )}
            {inputValue.trim() && filteredInterests.length > 0 && (
              <CommandGroup heading={t('common.selectAnInterest')}>
                {filteredInterests.slice(0, 10).map((interest) => (
                  <CommandItem
                    key={interest}
                    onSelect={() => handleSelectInterest(interest)}
                    className="cursor-pointer"
                  >
                    {interest}
                  </CommandItem>
                ))}
                {filteredInterests.length > 10 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    +{filteredInterests.length - 10} {t('common.moreResults')}
                  </div>
                )}
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
