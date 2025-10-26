import { useState, useRef, useEffect } from "react";
import { Play, Pause, Music } from "lucide-react";

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

  // Initialize audio element
  useEffect(() => {
    if (!song.preview_url) return;

    // Create audio element
    const audio = new Audio(song.preview_url);
    audio.preload = 'metadata';
    audioRef.current = audio;

    // Event listeners
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleError = (e: any) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [song.preview_url, song.id]);

  // Expose pause method globally
  useEffect(() => {
    const pauseMethod = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    
    (window as any)[`pauseAudio_${song.id}`] = pauseMethod;
    
    return () => {
      delete (window as any)[`pauseAudio_${song.id}`];
    };
  }, [song.id, isPlaying]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!song.preview_url || !audioRef.current) {
      console.log('No preview URL or audio ref');
      return;
    }

    const audio = audioRef.current;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Pause other songs
        onPlay?.();
        
        // Reset if at the end
        if (audio.ended) {
          audio.currentTime = 0;
        }
        
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

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
    <div className="flex-shrink-0" role="button" tabIndex={0}>
      <div
        className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-muted relative group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all`}
        onClick={togglePlay}
        title={hasPreview ? `${song.name} - ${song.artist}` : `${song.name} - ${song.artist} (Apri su Spotify)`}
      >
        {song.image_url ? (
          <img
            src={song.image_url}
            alt={song.name}
            className={`w-full h-full object-cover ${hasPreview ? 'group-hover:scale-105' : ''} transition-transform duration-300`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <Music className={`${size === 'small' ? 'h-5 w-5' : size === 'medium' ? 'h-8 w-8' : 'h-12 w-12'} text-primary/60`} />
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        {hasPreview && (
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {isPlaying ? (
              <Pause className={`${size === 'small' ? 'h-6 w-6' : size === 'medium' ? 'h-10 w-10' : 'h-16 w-16'} text-white drop-shadow-2xl`} />
            ) : (
              <Play className={`${size === 'small' ? 'h-6 w-6' : size === 'medium' ? 'h-10 w-10' : 'h-16 w-16'} text-white drop-shadow-2xl`} />
            )}
          </div>
        )}

        {/* Progress Bar */}
        {isPlaying && hasPreview && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* No Preview Badge */}
        {!hasPreview && size !== 'small' && (
          <div className="absolute bottom-1 left-1 right-1 bg-black/80 text-white text-[9px] text-center py-0.5 rounded font-medium">
            No preview
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-1 right-1">
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-0.5 bg-primary animate-pulse" style={{ height: '40%' }} />
              <div className="w-0.5 bg-primary animate-pulse" style={{ height: '80%', animationDelay: '0.2s' }} />
              <div className="w-0.5 bg-primary animate-pulse" style={{ height: '60%', animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>
      
      {size !== 'small' && (
        <div className="mt-1.5">
          <p className={`${textSizeClasses[size]} font-semibold text-foreground truncate`}>
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
