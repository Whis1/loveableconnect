import { ImageDialog } from "@/components/ImageDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  messageType: 'text' | 'image' | 'emoji' | 'gif' | 'voice';
  mediaUrl: string | null;
  isOwn: boolean;
  timestamp: string;
  messageId?: string;
  senderId?: string;
  receiverId?: string;
  matchId?: string;
  senderAvatarUrl?: string | null;
  senderNickname?: string;
  showAdminLabel?: boolean;
  sideLayout?: boolean;
}

export const MessageBubble = ({ 
  content, 
  messageType, 
  mediaUrl, 
  isOwn, 
  timestamp,
  messageId,
  senderId,
  receiverId,
  matchId,
  senderAvatarUrl,
  senderNickname,
  showAdminLabel = false,
  sideLayout = false
}: MessageBubbleProps) => {
  const renderContent = () => {
    switch (messageType) {
      case 'emoji':
        return <p className="text-6xl">{content}</p>;
      
      case 'image':
      case 'gif':
        return mediaUrl ? (
          <ImageDialog src={mediaUrl} alt={messageType === 'gif' ? 'GIF chat' : 'Immagine chat'}>
            <img
              src={mediaUrl}
              alt={messageType === 'gif' ? 'GIF chat' : 'Immagine chat'}
              className="max-w-xs rounded cursor-pointer hover:opacity-90 transition-opacity"
            />
          </ImageDialog>
        ) : (
          <p className="break-words whitespace-pre-wrap">{content || (messageType === 'gif' ? 'GIF' : 'Immagine')}</p>
        );
      
      case 'voice':
        return mediaUrl ? (
          <div className="flex items-center gap-2">
            <audio controls className="max-w-xs">
              <source src={mediaUrl} type="audio/webm" />
              Il tuo browser non supporta l'audio.
            </audio>
          </div>
        ) : (
          <p className="break-words whitespace-pre-wrap">🎤 Messaggio vocale</p>
        );
      
      default:
        return <p className="break-words whitespace-pre-wrap">{content?.trim() ? content : 'Messaggio vuoto'}</p>;
    }
  };

  // Layout "a lati" (standard messaggistica): i propri messaggi a DESTRA,
  // quelli dell'altra persona a SINISTRA.
  if (sideLayout) {
    return (
      <div className={`flex w-full items-end gap-2 px-2 md:px-4 ${isOwn ? "justify-end" : "justify-start"}`}>
        {!isOwn && (
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-purple-400/40">
            <AvatarImage src={senderAvatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-[85%] sm:max-w-[75%] md:max-w-[68%] w-fit px-4 py-2.5 shadow-sm rounded-2xl ${
            isOwn ? "rounded-br-md" : "rounded-bl-md"
          } ${
            messageType === 'emoji' ? 'bg-transparent shadow-none' :
            isOwn
              ? "bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-pink-500/25"
              : "bg-white/95 text-zinc-900 border border-black/5 dark:bg-white/10 dark:text-zinc-50 dark:border-white/10 backdrop-blur-sm"
          }`}
        >
          {renderContent()}
          <p
            className={`text-xs mt-1 ${
              messageType === 'emoji' ? 'text-muted-foreground text-center' :
              isOwn ? "text-white/75" : "text-zinc-500 dark:text-zinc-300/80"
            }`}
          >
            {new Date(timestamp).toLocaleString('it-IT', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: false
            }).replace(',', '')}
            {showAdminLabel && senderNickname && (
              <span className="ml-2 font-medium">
                • {senderNickname}
              </span>
            )}
          </p>
        </div>
        {isOwn && (
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-pink-400/40">
            <AvatarImage src={senderAvatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full px-2 md:px-4">
      <Avatar className="h-12 w-12 mr-3 shrink-0">
        <AvatarImage src={senderAvatarUrl || undefined} alt="Profile" />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[85%] sm:max-w-[75%] md:max-w-[68%] w-fit rounded-lg px-4 py-2 ${
          messageType === 'emoji' ? 'bg-transparent' : 
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        } mx-2 md:mx-3 ${isOwn ? 'ml-auto' : 'mr-auto'}`}
      >
        {renderContent()}
        <p
          className={`text-xs mt-1 ${
            messageType === 'emoji' ? 'text-muted-foreground text-center' :
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {new Date(timestamp).toLocaleString('it-IT', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
          }).replace(',', '')}
          {showAdminLabel && senderNickname && (
            <span className="ml-2 font-medium">
              • {senderNickname}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
