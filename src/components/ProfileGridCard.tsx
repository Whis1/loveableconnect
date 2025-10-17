import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  avatar_url: string | null;
  bio: string | null;
  distance?: number;
}

interface ProfileGridCardProps {
  profile: Profile;
  currentUserId: string;
  onLike: () => void;
}

export const ProfileGridCard = ({ profile, currentUserId, onLike }: ProfileGridCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  const avatarUrl = profile.avatar_url
    ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLiking || hasLiked) return;
    
    setIsLiking(true);
    
    try {
      const { error } = await supabase
        .from("likes")
        .insert({
          from_user_id: currentUserId,
          to_user_id: profile.id,
        });

      if (error) throw error;

      setHasLiked(true);
      
      // Check if there's a match
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)
        .maybeSingle();

      if (matchData) {
        toast({
          title: "È un Match! 💕",
          description: `Hai fatto match con ${profile.nickname || profile.full_name}!`,
        });
      } else {
        toast({
          title: t('search.likeSent'),
          description: `Like inviato a ${profile.nickname || profile.full_name}`,
        });
      }
      
      onLike();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if there's a match first
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)
      .maybeSingle();

    if (matchData) {
      // Navigate to chat
      navigate(`/chat/${matchData.id}`);
    } else {
      // Navigate to profile view
      navigate(`/profile/${profile.id}`);
    }
  };

  const handleCardClick = () => {
    navigate(`/profile/${profile.id}`);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Profile Image */}
      <div className="relative aspect-square bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profile.nickname || profile.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Avatar className="h-32 w-32">
              <AvatarFallback className="text-5xl">
                <UserIcon className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>

      {/* Profile Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold truncate">
            {profile.nickname || profile.full_name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {profile.age && <span>{profile.age} anni</span>}
            {profile.age && profile.gender && <span>•</span>}
            {profile.gender && (
              <span>
                {profile.gender === 'male' && 'Uomo'}
                {profile.gender === 'female' && 'Donna'}
                {profile.gender === 'transexual' && 'Transessuale'}
                {profile.gender === 'transgender' && 'Transgender'}
                {profile.gender === 'homosexual' && 'Omosessuale'}
                {profile.gender === 'non-binary' && 'Non-binario'}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant={hasLiked ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={handleLike}
            disabled={isLiking || hasLiked}
          >
            <Heart className={`h-4 w-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
            Like
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleChat}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Chat
          </Button>
        </div>
      </div>
    </Card>
  );
};
