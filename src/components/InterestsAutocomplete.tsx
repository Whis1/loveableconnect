import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface InterestsAutocompleteProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
  maxInterests?: number;
}

const PREDEFINED_INTERESTS = [
  // Sport e Fitness
  "Calcio", "Tennis", "Basket", "Pallavolo", "Nuoto", "Corsa", "Ciclismo", 
  "Yoga", "Pilates", "Palestra", "Fitness", "CrossFit", "Arrampicata", 
  "Surf", "Snowboard", "Sci", "Pattinaggio", "Danza", "Arti Marziali",
  "Boxe", "Rugby", "Golf", "Escursionismo", "Trekking", "Hiking",
  
  // Arte e Cultura
  "Arte", "Pittura", "Disegno", "Scultura", "Fotografia", "Cinema", 
  "Teatro", "Musica", "Concerti", "Festival", "Musei", "Mostre",
  "Architettura", "Design", "Letteratura", "Poesia", "Scrittura",
  "Calligrafia", "Fumetti", "Manga", "Anime",
  
  // Intrattenimento
  "Netflix", "Serie TV", "Film", "Documentari", "Gaming", "Videogiochi",
  "PlayStation", "Xbox", "Nintendo", "PC Gaming", "Streaming", "YouTube",
  "Podcast", "Audiolibri", "Karaoke", "Escape Room", "Board Games",
  
  // Musica
  "Rock", "Pop", "Jazz", "Classica", "Hip Hop", "Rap", "Reggae",
  "Metal", "Indie", "Elettronica", "House", "Techno", "Blues",
  "Folk", "Country", "R&B", "Soul", "Suonare Chitarra", "Pianoforte",
  "Batteria", "DJ", "Canto",
  
  // Viaggi e Avventura
  "Viaggi", "Backpacking", "Campeggio", "Avventura", "Esplorare",
  "Road Trip", "Voli", "Crociere", "Spiaggia", "Montagna", "Natura",
  "Wildlife", "Safari", "Immersioni", "Snorkeling", "Paracadutismo",
  
  // Cibo e Bevande
  "Cucina", "Cucinare", "Baking", "Pasticceria", "Vino", "Birra",
  "Cocktail", "Caffè", "Tè", "Ristoranti", "Street Food", "Food Tour",
  "Vegano", "Vegetariano", "Sushi", "Pizza", "Gourmet", "Degustazioni",
  
  // Lifestyle
  "Moda", "Shopping", "Make-up", "Skincare", "Wellness", "Meditazione",
  "Mindfulness", "Sostenibilità", "Ecologia", "Volontariato",
  "Beneficenza", "Giardinaggio", "Piante", "Animali", "Cani", "Gatti",
  "Equitazione", "Pesca", "Caccia",
  
  // Tecnologia e Scienza
  "Tecnologia", "Programmazione", "Coding", "IA", "Robotica",
  "Astronomia", "Fisica", "Chimica", "Biologia", "Scienza",
  "Innovazione", "Startup", "Crypto", "NFT", "Realtà Virtuale",
  
  // Sociale e Relazioni
  "Socializzare", "Feste", "Nightlife", "Discoteche", "Bar",
  "Aperitivi", "Brunch", "Networking", "Eventi", "Community",
  "Volontariato", "Politica", "Attivismo", "Dibattiti",
  
  // Hobby Creativi
  "Bricolage", "Fai da te", "Modellismo", "Collezionismo",
  "Antiquariato", "Vintage", "Artigianato", "Uncinetto", "Ricamo",
  "Lavorazione Legno", "Ceramica", "Origami", "Scrapbooking",
  
  // Benessere Mentale
  "Psicologia", "Filosofia", "Spiritualità", "Astrologia",
  "Tarocchi", "Crescita Personale", "Self-improvement", "Coaching",
  "Terapia", "Lettura", "Libri", "Giornalismo",
  
  // Auto e Motori
  "Auto", "Moto", "Meccanica", "Tuning", "Formula 1", "MotoGP",
  "Rally", "Karting", "Auto d'epoca",
].sort();

export function InterestsAutocomplete({
  selectedInterests,
  onInterestsChange,
  maxInterests = 4,
}: InterestsAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [filteredInterests, setFilteredInterests] = useState<string[]>([]);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = PREDEFINED_INTERESTS.filter(
        (interest) =>
          interest.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedInterests.includes(interest)
      );
      setFilteredInterests(filtered);
    } else {
      setFilteredInterests([]);
    }
  }, [inputValue, selectedInterests]);

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
            placeholder={`Cerca interessi... (${selectedInterests.length}/${maxInterests})`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {inputValue.trim() && filteredInterests.length === 0 && (
              <CommandEmpty>Nessun interesse trovato. Scegli dalla lista.</CommandEmpty>
            )}
            {inputValue.trim() && filteredInterests.length > 0 && (
              <CommandGroup heading="Seleziona un interesse">
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
                    +{filteredInterests.length - 10} altri risultati...
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      )}

      {selectedInterests.length >= maxInterests && (
        <p className="text-sm text-muted-foreground">
          Hai raggiunto il limite di {maxInterests} interessi.
        </p>
      )}
    </div>
  );
}
