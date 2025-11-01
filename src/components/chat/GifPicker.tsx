import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Image, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

interface GiphyGif {
  id: string;
  images: {
    fixed_height: {
      url: string;
    };
  };
}

export const GifPicker = ({ onGifSelect }: GifPickerProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);

  const POPULAR_SEARCHES = [
    { key: "love", term: t("chat.popularSearches.love") },
    { key: "happy", term: t("chat.popularSearches.happy") },
    { key: "excited", term: t("chat.popularSearches.excited") },
    { key: "laugh", term: t("chat.popularSearches.laugh") },
    { key: "sad", term: t("chat.popularSearches.sad") },
    { key: "angry", term: t("chat.popularSearches.angry") },
    { key: "dance", term: t("chat.popularSearches.dance") },
    { key: "party", term: t("chat.popularSearches.party") },
    { key: "thinking", term: t("chat.popularSearches.thinking") },
    { key: "yes", term: t("chat.popularSearches.yes") },
    { key: "no", term: t("chat.popularSearches.no") },
    { key: "thanks", term: t("chat.popularSearches.thanks") }
  ];

  useEffect(() => {
    fetchGifs(search);
  }, [search]);

  const fetchGifs = async (searchTerm: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-giphy', {
        body: { searchTerm, limit: 20 }
      });

      if (error) {
        console.error('Giphy function error:', error);
        throw error;
      }
      
      if (data && data.data) {
        setGifs(data.data);
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      // Non mostrare errore all'utente, mostra solo GIF vuote
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGifSelect = (gif: GiphyGif) => {
    onGifSelect(gif.images.fixed_height.url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button">
          <Image className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-background border shadow-lg" align="end" sideOffset={8}>
        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("chat.searchGif")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">{t("chat.popular")}</h4>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSearch(item.term)}
                  className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 rounded-full transition-colors"
                >
                  {item.term}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleGifSelect(gif)}
                  className="aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity border"
                >
                  <img src={gif.images.fixed_height.url} alt="GIF" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
