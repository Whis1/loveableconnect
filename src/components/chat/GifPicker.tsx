import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Image, Search } from "lucide-react";

// Popular GIF search terms
const POPULAR_SEARCHES = [
  "happy", "love", "excited", "laugh", "sad", "angry", 
  "dance", "celebration", "thinking", "yes", "no", "thanks"
];

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

export const GifPicker = ({ onGifSelect }: GifPickerProps) => {
  const [search, setSearch] = useState("");
  const [gifs] = useState<string[]>([
    "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
    "https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif",
    "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
    "https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif",
  ]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button">
          <Image className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96" align="end">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca GIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold">Popolari</h4>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearch(term)}
                  className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {gifs.map((gif, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onGifSelect(gif)}
                className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity"
              >
                <img src={gif} alt="GIF" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
