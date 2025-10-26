import { useState, useRef, useEffect } from "react";
import { Play, Pause, Music } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SpotifySongCardProps {
  song: {
    id: string;
    name: string;
    artist: string;
    album: string;
    image_url: string | null;
    preview_url: string | null;
  };
  size?: "small" | "medium" | "large";
  onPlay?: () => void;
}

export const SpotifySongCard = ({ song, size = "medium", onPlay }: SpotifySongCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!song.preview_url) return;

    const audio = new Audio(song.preview_url);
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [song.preview_url]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!song.preview_url) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Call onPlay to pause other songs
      onPlay?.();
      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Expose pause method
  useEffect(() => {
    (window as any)[`pauseAudio_${song.id}`] = pauseAudio;
    return () => {
      delete (window as any)[`pauseAudio_${song.id}`];
    };
  }, [song.id, isPlaying]);

  const sizeClasses = {
    small: "w-12 h-12",
    medium: "w-20 h-20",
    large: "w-32 h-32"
  };

  const textSizeClasses = {
    small: "text-[10px]",
    medium: "text-xs",
    large: "text-sm"
  };

  const hasPreview = !!song.preview_url;

  return (
    <div className="flex-shrink-0 group">
      <div
        className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-muted relative ${hasPreview ? 'cursor-pointer' : ''}`}
        onClick={hasPreview ? togglePlay : undefined}
        title={hasPreview ? `${song.name} - ${song.artist}` : `${song.name} - ${song.artist} (Anteprima non disponibile)`}
      >
        {song.image_url ? (
          <img
            src={song.image_url}
            alt={song.name}
            className={`w-full h-full object-cover ${hasPreview ? 'group-hover:scale-105' : ''} transition-transform`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <Music className={`${size === 'small' ? 'h-5 w-5' : size === 'medium' ? 'h-8 w-8' : 'h-12 w-12'} text-primary/60`} />
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        {hasPreview && (
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            {isPlaying ? (
              <Pause className={`${size === 'small' ? 'h-5 w-5' : size === 'medium' ? 'h-8 w-8' : 'h-12 w-12'} text-white drop-shadow-lg`} />
            ) : (
              <Play className={`${size === 'small' ? 'h-5 w-5' : size === 'medium' ? 'h-8 w-8' : 'h-12 w-12'} text-white drop-shadow-lg`} />
            )}
          </div>
        )}

        {/* Progress Bar */}
        {isPlaying && hasPreview && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* No Preview Badge */}
        {!hasPreview && size !== 'small' && (
          <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[8px] text-center py-0.5 rounded">
            No preview
          </div>
        )}
      </div>
      
      {size !== 'small' && (
        <div className="mt-1">
          <p className={`${textSizeClasses[size]} font-medium text-foreground truncate`}>
            {song.name}
          </p>
          <p className={`${size === 'large' ? 'text-xs' : 'text-[10px]'} text-muted-foreground truncate`}>
            {song.artist}
          </p>
        </div>
      )}
    </div>
  );
};
