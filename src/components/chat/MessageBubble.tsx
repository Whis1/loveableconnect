import { ImageDialog } from "@/components/ImageDialog";

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
  matchId
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
        return <p className="break-words whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          messageType === 'emoji' ? 'bg-transparent' : 
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
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
    </div>
  );
};
