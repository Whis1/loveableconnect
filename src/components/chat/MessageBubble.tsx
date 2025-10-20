import { ImageDialog } from "@/components/ImageDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  messageType: 'text' | 'image' | 'emoji' | 'gif';
  mediaUrl: string | null;
  isOwn: boolean;
  timestamp: string;
  messageId?: string;
  senderId?: string;
  receiverId?: string;
  matchId?: string;
  senderAvatarUrl?: string | null;
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
  senderAvatarUrl
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
      
      default:
        return <p className="break-words whitespace-pre-wrap">{content?.trim() ? content : 'Messaggio vuoto'}</p>;
    }
  };

  return (
    <div className="flex w-full px-2 md:px-4">
      {!isOwn && (
        <Avatar className="h-12 w-12 mr-3 shrink-0">
          <AvatarImage src={senderAvatarUrl || undefined} alt="Profile" />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
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
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isOwn && (
        <Avatar className="h-12 w-12 ml-3 shrink-0">
          <AvatarImage src={senderAvatarUrl || undefined} alt="Profile" />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
