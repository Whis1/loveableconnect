import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    province?: string;
    state?: string;
  };
}

export const PlacesAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Es: Milano, Roma, Torino...",
  required = false,
  id = "places-autocomplete"
}: PlacesAutocompleteProps) => {
  const { i18n, t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // Ref sempre aggiornato di hasSelected: la closure della fetch usava il
  // valore "vecchio" (al momento del setTimeout), quindi quando l'utente
  // selezionava una citta' e la fetch in volo tornava, la dropdown si
  // riapriva perche' la closure leggeva ancora hasSelected=false.
  const hasSelectedRef = useRef(hasSelected);
  useEffect(() => {
    hasSelectedRef.current = hasSelected;
  }, [hasSelected]);
  // AbortController per cancellare le fetch in volo quando l'utente
  // seleziona una voce: senza, la fetch poteva risolversi dopo il click
  // e riaprire la dropdown con i vecchi risultati.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Se l'utente ha selezionato, non fare piu' ricerche
    if (hasSelected) {
      return;
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Annulla eventuale fetch precedente ancora in volo.
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(value)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=8`,
          {
            headers: {
              'Accept-Language': i18n.language,
            },
            signal,
          }
        );

        // Se la fetch e' stata cancellata o l'utente ha gia' selezionato
        // nel frattempo, non aggiorniamo piu' lo stato (eviteremmo di
        // riaprire la dropdown sopra una selezione gia' fatta).
        if (signal.aborted || hasSelectedRef.current) return;

        const data: NominatimResult[] = await response.json();

        if (signal.aborted || hasSelectedRef.current) return;

        const formattedSuggestions = data
          .map((result) => {
            const city = result.address.city || result.address.town || result.address.village || '';
            const province = result.address.province || result.address.state || '';

            let label = '';
            if (city && province) {
              // Extract province abbreviation if available (e.g., "MI" from "Milano")
              const provinceAbbr = province.match(/\(([^)]+)\)/)?.[1] || province;
              label = `${city}, ${provinceAbbr}`;
            } else {
              label = city || province;
            }

            return {
              label,
              lat: parseFloat(result.lat),
              lon: parseFloat(result.lon),
            };
          })
          .filter((suggestion, index, self) =>
            suggestion.label && self.findIndex(s => s.label === suggestion.label) === index
          );

        // Doppio check: se l'utente ha cliccato mentre processavamo, fermati.
        if (hasSelectedRef.current) return;

        setSuggestions(formattedSuggestions);
        if (formattedSuggestions.length > 0 && !hasSelectedRef.current) {
          setShowSuggestions(true);
        }
      } catch (error: any) {
        // AbortError e' atteso quando l'utente seleziona: non lo logghiamo.
        if (error?.name === 'AbortError') return;
        console.error("Errore nel recupero delle citta':", error);
        setSuggestions([]);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }, 150);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Cancella anche la fetch eventualmente in corso.
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [value, i18n.language, hasSelected]);

  const handleSelect = useCallback((suggestion: { label: string; lat: number; lon: number }) => {
    // Importante: marca SUBITO come selezionato (anche nel ref) e cancella
    // qualsiasi fetch in volo. Senza questo, una fetch lenta poteva tornare
    // dopo il click e riaprire la dropdown.
    hasSelectedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortRef.current) abortRef.current.abort();
    onChange(suggestion.label, suggestion.lat, suggestion.lon);
    setShowSuggestions(false);
    setHasSelected(true);
    setSuggestions([]);
  }, [onChange]);

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          onChange(newValue);
          // Reset selezione se l'utente modifica il testo
          if (hasSelected && newValue !== value) {
            setHasSelected(false);
          }
          if (newValue.length >= 2 && !hasSelected) {
            setShowSuggestions(true);
          }
        }}
        onFocus={() => {
          // Mostra suggerimenti solo se NON ha già selezionato
          if (suggestions.length > 0 && value.length >= 2 && !hasSelected) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          // Chiudi dropdown dopo un breve delay per permettere il click
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
          }
          blurTimeoutRef.current = setTimeout(() => {
            setShowSuggestions(false);
          }, 200);
        }}
        required={required}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Command className="rounded-lg border shadow-md bg-background">
            <CommandList>
              {isLoading ? (
                <CommandEmpty>{t("common.loading")}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.label}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Previeni il blur
                        handleSelect(suggestion);
                      }}
                      className="cursor-pointer hover:bg-accent"
                    >
                      {suggestion.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
