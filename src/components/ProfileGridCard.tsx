import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ProfileDialog } from "./ProfileDialog";

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
  onLike: (profileId: string) => void;
}

export const ProfileGridCard = ({ profile, currentUserId, onLike }: ProfileGridCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Check if user already liked this profile
  useEffect(() => {
    const checkExistingLike = async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profile.id)
        .maybeSingle();
      
      if (data) {
        setHasLiked(true);
      }
    };
    
    checkExistingLike();
  }, [currentUserId, profile.id]);

  const avatarUrl = profile.avatar_url
    ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLiking) return;
    
    setIsLiking(true);
    
    try {
      // Check if like already exists
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profile.id)
        .maybeSingle();

      if (existingLike) {
        // Remove the like
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("id", existingLike.id);

        if (error) throw error;

        setHasLiked(false);
        toast({
          title: "Like rimosso",
          description: `Hai rimosso il like da ${profile.nickname || profile.full_name}`,
        });
      } else {
        // Add the like
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
      }
      
      onLike(profile.id);
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
      // Open profile dialog
      setShowProfileDialog(true);
    }
  };

  const handleCardClick = () => {
    setShowProfileDialog(true);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50 h-full flex flex-col"
      onClick={handleCardClick}
    >
      {/* Profile Image */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profile.nickname || profile.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Avatar className="h-32 w-32">
              <AvatarFallback className="text-5xl bg-gradient-to-br from-primary/20 to-secondary/20">
                <UserIcon className="h-16 w-16 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Distance Badge */}
        {profile.distance && (
          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
            {profile.distance} km
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="p-5 space-y-4 bg-card flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="text-xl font-bold truncate text-foreground mb-2">
            {profile.nickname || profile.full_name}
          </h3>
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            {profile.age && <span className="font-medium">{profile.age} anni</span>}
            {profile.age && profile.gender && <span>•</span>}
            {profile.gender && (
              <span className="capitalize">
                {profile.gender === 'male' && 'Uomo'}
                {profile.gender === 'female' && 'Donna'}
                {profile.gender === 'transexual' && 'Transessuale'}
                {profile.gender === 'transgender' && 'Transgender'}
                {profile.gender === 'homosexual' && 'Omosessuale'}
                {profile.gender === 'non-binary' && 'Non-binario'}
              </span>
            )}
          </div>
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            variant={hasLiked ? "default" : "outline"}
            size="lg"
            className="w-full font-semibold text-base py-6"
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-6 w-6 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
            {hasLiked ? 'Rimuovi Like' : 'Mi Piace'}
          </Button>
          <Button
            variant="default"
            size="lg"
            className="w-full font-semibold text-base py-6 bg-gradient-to-r from-primary to-primary/80"
            onClick={handleChat}
          >
            <MessageCircle className="h-6 w-6 mr-2" />
            Messaggio
          </Button>
        </div>
      </div>

      <ProfileDialog
        profileId={profile.id}
        currentUserId={currentUserId}
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
      />
    </Card>
  );
};
