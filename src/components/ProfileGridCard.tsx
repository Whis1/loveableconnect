import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ProfileDialog } from "./ProfileDialog";
import { getGenericLocationPhrase } from "@/lib/utils";

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  looking_for: string[] | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  distance?: number;
}

interface ProfileGridCardProps {
  profile: Profile;
  currentUserId: string;
  onLike: (profileId: string) => void;
  onMatch?: (profileName: string) => void;
}

export const ProfileGridCard = ({ profile, currentUserId, onLike, onMatch }: ProfileGridCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return "";
    const genderMap: Record<string, string> = {
      male: "Uomo",
      female: "Donna",
      transgender: "Transgender",
      transexual: "Transessuale",
      trans: "Transgender",
      genderfluid: "Genderfluid",
      "non-binary": "Non binario",
      uomo: "Uomo",
      donna: "Donna",
    };
    return genderMap[gender.toLowerCase()] || gender;
  };

  const getOrientationLabel = (orientation: string | null) => {
    if (!orientation) return "";
    const orientationMap: Record<string, string> = {
      heterosexual: "Eterosessuale",
      homosexual: "Omosessuale",
      bisexual: "Bisessuale",
      pansexual: "Pansessuale",
      asexual: "Asessuale",
    };
    return orientationMap[orientation] || orientation;
  };

  const getRelationshipStatusLabel = (status: string | null) => {
    if (!status) return "";
    const statusMap: Record<string, string> = {
      single: "Single",
      in_relationship: "In relazione",
      married: "Sposato/a",
      divorced: "Divorziato/a",
      widowed: "Vedovo/a",
      prefer_not_say: "Preferisco non dirlo",
    };
    return statusMap[status] || status;
  };

  const getLookingForLabel = (lookingFor: string[] | null) => {
    if (!lookingFor || lookingFor.length === 0) return "";
    return lookingFor.join(", ");
  };

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
    
    if (isLiking || hasLiked) return; // Prevent double-click and removing likes
    
    setIsLiking(true);
    
    try {
      // Add the like using edge function
      const { data: likeData, error: likeError } = await supabase.functions.invoke(
        'admin-manage-like',
        {
          body: {
            action: 'add',
            fromUserId: currentUserId,
            toUserId: profile.id
          }
        }
      );

      if (likeError) throw likeError;

      if (likeData?.match_created) {
        // Match was created!
        setHasLiked(true);
        if (onMatch) {
          onMatch(profile.nickname || profile.full_name);
        }
      } else {
        // Just a like, no match
        setHasLiked(true);
        toast({
          title: t("search.likeSent"),
          description: `Like inviato a ${profile.nickname || profile.full_name}`,
        });
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
    <>
      <div 
        className="group relative cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Card Container */}
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-card border-2 border-border hover:border-primary/50">
          {/* Main Image */}
          <div className="relative aspect-[3/4] overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.nickname}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="text-6xl font-bold text-primary/20">
                  {profile.nickname.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Distance Badge */}
            {profile.distance && (
              <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                {profile.distance} km
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="p-4 space-y-2.5">
            {/* Name and Age */}
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold text-foreground truncate">
                {profile.nickname}
              </h3>
              {profile.age && (
                <span className="text-base text-muted-foreground font-medium">
                  {profile.age}
                </span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span className="truncate">{getGenericLocationPhrase()}</span>
            </div>

            {/* Gender & Orientation Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {profile.gender && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {getGenderLabel(profile.gender)}
                </span>
              )}
              {profile.sexual_orientation && (
                <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground text-xs font-medium">
                  {getOrientationLabel(profile.sexual_orientation)}
                </span>
              )}
            </div>

            {/* Relationship Status & Looking For */}
            <div className="space-y-1">
              {profile.relationship_status && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Stato:</span> {getRelationshipStatusLabel(profile.relationship_status)}
                </div>
              )}
              {profile.looking_for && profile.looking_for.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Cerca:</span> {getLookingForLabel(profile.looking_for)}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant={hasLiked ? "default" : "outline"}
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={handleLike}
                disabled={isLiking || hasLiked}
              >
                <Heart className={`h-3.5 w-3.5 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
                {hasLiked ? "Piaciuto" : "Mi Piace"}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-9 text-xs bg-gradient-to-r from-primary to-primary/80"
                onClick={handleChat}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ProfileDialog
        profileId={profile.id}
        currentUserId={currentUserId}
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
      />
    </>
  );
};
