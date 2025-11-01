import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
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
  const [isSelecting, setIsSelecting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
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
        if (formattedSuggestions.length > 0) {
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
  }, [value, i18n.language]);

  const handleSelect = useCallback((suggestion: { label: string; lat: number; lon: number }) => {
    setIsSelecting(true);
    onChange(suggestion.label, suggestion.lat, suggestion.lon);
    setShowSuggestions(false);
    setTimeout(() => setIsSelecting(false), 100);
  }, [onChange]);

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.length >= 2) {
            setShowSuggestions(true);
          }
        }}
        onFocus={() => {
          if (suggestions.length > 0 && value.length >= 2) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          if (!isSelecting) {
            setTimeout(() => setShowSuggestions(false), 300);
          }
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
