import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

interface NominatimResult {
  display_name: string;
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
          `limit=5`,
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
            
            if (city && province) {
              // Extract province abbreviation if available (e.g., "MI" from "Milano")
              const provinceAbbr = province.match(/\(([^)]+)\)/)?.[1] || province;
              return `${city}, ${provinceAbbr}`;
            }
            return city || province;
          })
          .filter((suggestion, index, self) => 
            suggestion && self.indexOf(suggestion) === index
          );

        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Errore nel recupero delle città:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, i18n.language]);

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        required={required}
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
                      key={suggestion}
                      onSelect={() => {
                        onChange(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="cursor-pointer"
                    >
                      {suggestion}
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
