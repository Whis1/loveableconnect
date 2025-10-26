import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Music, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SpotifySong {
  id: string;
  name: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
}

interface SpotifySongSelectorProps {
  selectedSongs: SpotifySong[];
  onSongsChange: (songs: SpotifySong[]) => void;
  maxSongs?: number;
}

export const SpotifySongSelector = ({ 
  selectedSongs, 
  onSongsChange,
  maxSongs = 5 
}: SpotifySongSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifySong[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await handleSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (searchQuery.trim() === "") return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query: searchQuery }
      });

      if (error) throw error;
      setSearchResults(data.tracks || []);
    } catch (error: any) {
      console.error('Error searching Spotify:', error);
      toast({
        title: "Errore nella ricerca",
        description: error.message || "Impossibile cercare le canzoni",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = (song: SpotifySong) => {
    if (selectedSongs.length >= maxSongs) {
      toast({
        title: "Limite raggiunto",
        description: `Puoi selezionare massimo ${maxSongs} canzoni`,
        variant: "destructive",
      });
      return;
    }

    if (selectedSongs.some(s => s.id === song.id)) {
      toast({
        title: "Canzone già aggiunta",
        description: "Questa canzone è già nella tua lista",
        variant: "destructive",
      });
      return;
    }

    onSongsChange([...selectedSongs, song]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveSong = (songId: string) => {
    onSongsChange(selectedSongs.filter(s => s.id !== songId));
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca canzoni su Spotify..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isSearching && (
        <div className="text-center text-sm text-muted-foreground">
          Ricerca in corso...
        </div>
      )}

      {searchResults.length > 0 && (
        <ScrollArea className="h-64 border rounded-lg">
          <div className="p-2 space-y-2">
            {searchResults.map((song) => (
              <Card
                key={song.id}
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleAddSong(song)}
              >
                {song.image_url ? (
                  <img
                    src={song.image_url}
                    alt={song.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {selectedSongs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Canzoni selezionate ({selectedSongs.length}/{maxSongs})
          </p>
          <div className="space-y-2">
            {selectedSongs.map((song) => (
              <Card key={song.id} className="p-3 flex items-center gap-3">
                {song.image_url ? (
                  <img
                    src={song.image_url}
                    alt={song.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSong(song.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
