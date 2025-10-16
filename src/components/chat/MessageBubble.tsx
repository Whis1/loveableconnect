import { ImageDialog } from "@/components/ImageDialog";
import { GalleryAccessRequestMessage } from "./GalleryAccessRequestMessage";

interface MessageBubbleProps {
  content: string;
  messageType: 'text' | 'image' | 'emoji' | 'gif' | 'gallery_access_request' | 'gallery_access_response';
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
      case 'gallery_access_request':
        return messageId && senderId && receiverId && matchId ? (
          <GalleryAccessRequestMessage
            messageId={messageId}
            senderId={senderId}
            receiverId={receiverId}
            matchId={matchId}
            isReceiver={!isOwn}
          />
        ) : null;
      
      case 'gallery_access_response':
        return (
          <div className="text-sm text-muted-foreground italic">
            {content}
          </div>
        );
      
      case 'emoji':
        return <p className="text-6xl">{content}</p>;
      
      case 'image':
      case 'gif':
        return mediaUrl ? (
          <ImageDialog src={mediaUrl} alt="Immagine chat">
            <img
              src={mediaUrl}
              alt="Immagine chat"
              className="max-w-xs rounded cursor-pointer hover:opacity-90 transition-opacity"
            />
          </ImageDialog>
        ) : null;
      
      default:
        return <p className="break-words">{content}</p>;
    }
  };

  // Per i messaggi di sistema, non mostrare il bubble tradizionale
  if (messageType === 'gallery_access_request' || messageType === 'gallery_access_response') {
    return (
      <div className="my-2">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          messageType === 'emoji' ? 'bg-transparent' : 
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
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
