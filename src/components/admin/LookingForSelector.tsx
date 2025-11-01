import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface LookingForSelectorProps {
  selectedOptions: string[];
  onOptionsChange: (options: string[]) => void;
  maxOptions?: number;
}

const LOOKING_FOR_OPTIONS = [
  "Relazione seria",
  "Relazione aperta",
  "Amicizia",
  "Avventure",
  "Chat",
  "Eventi sociali",
  "Compagnia",
  "Qualcosa di casuale",
  "Non specificato",
];

export function LookingForSelector({
  selectedOptions,
  onOptionsChange,
  maxOptions = 3,
}: LookingForSelectorProps) {
  const handleToggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onOptionsChange(selectedOptions.filter((o) => o !== option));
    } else if (selectedOptions.length < maxOptions) {
      onOptionsChange([...selectedOptions, option]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Options */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option}
              variant="secondary"
              className="text-sm py-1 px-3 cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              {option}
              <button
                type="button"
                onClick={() => handleToggleOption(option)}
                className="ml-2 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Available Options */}
      <div className="flex flex-wrap gap-2">
        {LOOKING_FOR_OPTIONS.filter(opt => !selectedOptions.includes(opt)).map((option) => (
          <Badge
            key={option}
            variant="outline"
            className={`text-sm py-1 px-3 cursor-pointer transition-colors ${
              selectedOptions.length >= maxOptions
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-primary hover:text-primary-foreground'
            }`}
            onClick={() => {
              if (selectedOptions.length < maxOptions) {
                handleToggleOption(option);
              }
            }}
          >
            {option}
          </Badge>
        ))}
      </div>

      {selectedOptions.length >= maxOptions && (
        <p className="text-sm text-muted-foreground">
          Limite raggiunto ({maxOptions} opzioni max)
        </p>
      )}
    </div>
  );
}
