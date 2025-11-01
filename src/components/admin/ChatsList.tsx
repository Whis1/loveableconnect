import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Conversation {
  userId: string;
  userNickname: string;
  userAvatar: string | null;
  adminProfileId: string;
  adminNickname: string;
  matchId: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatsListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export const ChatsList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
}: ChatsListProps) => {
  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Conversazioni
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {conversations.length} {conversations.length === 1 ? "conversazione" : "conversazioni"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nessuna conversazione ancora
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={`${conv.matchId}-${conv.userId}`}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all hover:bg-accent/50",
                  selectedConversation?.matchId === conv.matchId &&
                    selectedConversation?.userId === conv.userId &&
                    "bg-accent border border-primary/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={getAvatarUrl(conv.userAvatar) || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {conv.userNickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {conv.userNickname}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="h-5 min-w-[20px] px-1.5 text-xs"
                        >
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">
                        Admin: {conv.adminNickname}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), {
                          addSuffix: true,
                          locale: it,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
