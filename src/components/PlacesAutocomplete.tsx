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
  const timeoutRef = useRef<NodeJS.Timeout>();
  const blurTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Se l'utente ha selezionato, non fare più ricerche
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
            }
          }
        );

        const data: NominatimResult[] = await response.json();
        
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

        setSuggestions(formattedSuggestions);
        if (formattedSuggestions.length > 0 && !hasSelected) {
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Errore nel recupero delle città:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, i18n.language, hasSelected]);

  const handleSelect = useCallback((suggestion: { label: string; lat: number; lon: number }) => {
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
