import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin, Sparkles, User, Heart as HeartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getGenericLocationPhrase } from "@/lib/utils";
import { ChatConfirmationBanner } from "./ChatConfirmationBanner";
import { useCredits } from "@/hooks/useCredits";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  looking_for: string[] | null;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
}

interface ProfileDialogProps {
  profileId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({
  profileId,
  currentUserId,
  open,
  onOpenChange,
}: ProfileDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [translatedBio, setTranslatedBio] = useState<string>('');
  const [translatedInterests, setTranslatedInterests] = useState<string[]>([]);
  const [showChatConfirmation, setShowChatConfirmation] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { translateText, translateArray } = useTextTranslation();
  const { credits } = useCredits();

  useEffect(() => {
    if (!open || !profileId) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (data) {
        setProfile(data);
        
        // Get avatar URL
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage
            .from("profile-images")
            .getPublicUrl(data.avatar_url);
          setAvatarUrl(urlData.publicUrl);
        }

        // Get photo URLs
        if (data.photos && data.photos.length > 0) {
          const urls = data.photos.map((photo: string) => {
            const { data: urlData } = supabase.storage
              .from("profile-images")
              .getPublicUrl(photo);
            return urlData.publicUrl;
          });
          setPhotoUrls(urls);
        }
      }

      // Check if already liked
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profileId)
        .maybeSingle();

      setHasLiked(!!likeData);

      // Check for match
      const { data: matchData } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
        .maybeSingle();

      if (matchData) {
        // Check if match is hidden with 'both'
        const { data: hiddenData } = await supabase
          .from("hidden_matches")
          .select("hidden_from")
          .eq("match_id", matchData.id)
          .eq("user_id", currentUserId)
          .eq("hidden_from", "both")
          .maybeSingle();
        
        // Match is active if it exists and is not hidden with 'both'
        setHasActiveMatch(!hiddenData);
      } else {
        setHasActiveMatch(false);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile-dialog-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profileId}`
        },
        (payload) => {
          console.log('Profile updated in dialog:', payload.new);
          const updatedProfile = payload.new as Profile;
          setProfile(updatedProfile);
          
          // Update avatar URL if changed
          if (updatedProfile.avatar_url) {
            const { data: urlData } = supabase.storage
              .from("profile-images")
              .getPublicUrl(updatedProfile.avatar_url);
            setAvatarUrl(urlData.publicUrl);
          }
          
          // Update photo URLs if changed
          if (updatedProfile.photos && updatedProfile.photos.length > 0) {
            const urls = updatedProfile.photos.map((photo: string) => {
              const { data: urlData } = supabase.storage
                .from("profile-images")
                .getPublicUrl(photo);
              return urlData.publicUrl;
            });
            setPhotoUrls(urls);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, currentUserId, open]);

  useEffect(() => {
    const loadTranslations = async () => {
      // Use pre-translated data if available
      if (profile?.translatedBio) {
        setTranslatedBio(profile.translatedBio);
      } else if (profile?.bio) {
        const translated = await translateText(profile.bio);
        setTranslatedBio(translated);
      }
      
      if (profile?.translatedInterests) {
        setTranslatedInterests(profile.translatedInterests);
      } else if (profile?.interests) {
        const translated = await translateArray(profile.interests);
        setTranslatedInterests(translated);
      }
    };
    loadTranslations();
  }, [profile?.bio, profile?.interests, profile?.translatedBio, profile?.translatedInterests]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profileId)
        .maybeSingle();

      if (existingLike) {
        // Remove like
        await supabase.from("likes").delete().eq("id", existingLike.id);
        setHasLiked(false);
        toast({
          title: t("explore.match.title"),
          description: `${t("explore.match.description", { name: profile?.nickname || profile?.full_name })}`,
        });
      } else {
        // Add like
        await supabase.from("likes").insert({
          from_user_id: currentUserId,
          to_user_id: profileId,
        });
        setHasLiked(true);

        // Check for match
        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
          .maybeSingle();

        if (matchData) {
          toast({
            title: t("explore.match.title"),
            description: t("explore.match.description", { name: profile?.nickname || profile?.full_name }),
          });
        } else {
          toast({
            title: t("search.likeSent"),
            description: `${t("search.likedProfile")} ${profile?.nickname || profile?.full_name}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleChat = async () => {
    // Check if there's a match first
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
      .maybeSingle();

    if (matchData) {
      // Navigate to chat
      navigate(`/chat/${matchData.id}`);
      onOpenChange(false);
    } else {
      // Show chat confirmation banner
      setShowChatConfirmation(true);
    }
  };

  const handleConfirmChat = async () => {
    if (isCreatingChat) return;
    
    setIsCreatingChat(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsCreatingChat(false);
        return;
      }

      // Verifica crediti sufficienti
      if (!credits || credits.balance < 6) {
        toast({
          title: t("common.error"),
          description: "Crediti insufficienti per iniziare una chat",
          variant: "destructive",
        });
        setShowChatConfirmation(false);
        setIsCreatingChat(false);
        return;
      }

      // Deduce 6 crediti usando la RPC function
      const { data: deductSuccess, error: deductError } = await supabase.rpc(
        "deduct_credits",
        { _user_id: session.user.id, _amount: 6 }
      );

      if (deductError || !deductSuccess) {
        toast({
          title: t("common.error"),
          description: "Crediti insufficienti per iniziare una chat",
          variant: "destructive",
        });
        setShowChatConfirmation(false);
        setIsCreatingChat(false);
        return;
      }

      // Crea il match
      const user1Id = currentUserId < profileId ? currentUserId : profileId;
      const user2Id = currentUserId < profileId ? profileId : currentUserId;

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
        })
        .select()
        .single();

      if (matchError) {
        console.error('Errore creazione match:', matchError);
        toast({
          title: t("common.error"),
          description: "Errore nella creazione della chat",
          variant: "destructive",
        });
        setIsCreatingChat(false);
        return;
      }

      toast({
        title: "Chat attivata!",
        description: `Ora puoi chattare con ${profile?.nickname || profile?.full_name}!`,
      });

      setShowChatConfirmation(false);
      setIsCreatingChat(false);
      onOpenChange(false);
      
      // Naviga alla chat
      navigate(`/chat/${matchData.id}`);
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: t("common.error"),
        description: "Si è verificato un errore",
        variant: "destructive",
      });
      setIsCreatingChat(false);
    }
  };

  const getGenderLabel = (gender: string) => {
    const key = gender.toLowerCase();
    const labels: Record<string, string> = {
      male: t('common.male'),
      uomo: t('common.male'),
      female: t('common.female'),
      donna: t('common.female'),
      transgender: t('common.transgender'),
      transexual: t('common.transexual'),
      transessuale: t('common.transexual'),
      genderfluid: t('common.genderfluid'),
      "non-binary": t('common.nonBinary'),
      "non binario": t('common.nonBinary'),
      other: t('common.other'),
      altro: t('common.other'),
    };
    return labels[key] || gender;
  };

  const getOrientationLabel = (orientation: string) => {
    const key = orientation.toLowerCase();
    const labels: Record<string, string> = {
      heterosexual: t('common.heterosexual'),
      eterosessuale: t('common.heterosexual'),
      homosexual: t('common.homosexual'),
      omosessuale: t('common.homosexual'),
      bisexual: t('common.bisexual'),
      bisessuale: t('common.bisexual'),
      pansexual: t('common.pansexual'),
      pansessuale: t('common.pansexual'),
      asexual: t('common.asexual'),
      asessuale: t('common.asexual'),
      other: t('common.other'),
      altro: t('common.other'),
    };
    return labels[key] || orientation;
  };
  const getRelationshipTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      serious: t('profile.seriousRelationship'),
      casual: t('profile.casualDating'),
      friendship: t('profile.friendship'),
    };
    return labels[type] || type;
  };

  if (!profile) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-background via-background to-primary/5">
          {/* Hero Section with Avatar Rectangle */}
          <div className="relative p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
            
            {/* Avatar Rectangle */}
            <div className="relative flex flex-col items-center">
              <div className="relative group">
                {/* Main Rectangle Card */}
                <div className="relative w-48 h-64 rounded-3xl border-4 border-background shadow-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 transform transition-transform duration-300 group-hover:scale-105">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-8xl font-bold text-primary/40">
                        {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                </div>
                
                {/* Sparkle Badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-3 shadow-xl rotate-12 group-hover:rotate-0 transition-transform duration-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                
                {/* Decorative Corner Elements */}
                <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-primary/20 rounded-full blur-xl"></div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-primary/20 rounded-full blur-xl"></div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-6 mt-6">
            {/* Name and Basic Info */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {profile.nickname || profile.full_name}
              </h2>
              
              {/* Age, Gender, Orientation Pills */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {profile.age && (
                  <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {profile.age} {t('userProfile.years')}
                  </div>
                )}
                {profile.gender && (
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    <User className="h-3.5 w-3.5 inline mr-1" />
                    {getGenderLabel(profile.gender)}
                  </div>
                )}
                {profile.sexual_orientation && (
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-600/10 text-pink-600 dark:text-pink-400 font-semibold text-sm">
                    <HeartIcon className="h-3.5 w-3.5 inline mr-1" />
                    {getOrientationLabel(profile.sexual_orientation)}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{getGenericLocationPhrase()}</span>
              </div>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Bio
                </h3>
                <p className="text-muted-foreground leading-relaxed italic">
                  "{translatedBio || profile.bio}"
                </p>
              </div>
            )}

            {/* Relationship Status Section */}
            {profile.relationship_status && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  {t('common.relationshipStatus')}
                </h3>
                <div className="text-base font-medium">
                  {profile.relationship_status === 'single' ? t('common.single') :
                   profile.relationship_status === 'in_relationship' ? t('common.inRelationship') :
                   profile.relationship_status === 'married' ? t('common.married') :
                   profile.relationship_status === 'sposato' ? t('common.married') :
                   profile.relationship_status === 'divorced' ? t('common.divorced') :
                   profile.relationship_status === 'divorziato' ? t('common.divorced') :
                   profile.relationship_status === 'widowed' ? t('common.widowed') :
                   profile.relationship_status === 'vedovo' ? t('common.widowed') :
                   profile.relationship_status === 'prefer_not_say' ? t('common.preferNotSay') :
                   profile.relationship_status === 'preferisco_non_dirlo' ? t('common.preferNotSay') :
                   profile.relationship_status === 'scoprilo' ? t('common.notSpecified') :
                   profile.relationship_status}
                </div>
              </div>
            )}

            {/* Looking For Section */}
            {(profile.looking_for && profile.looking_for.length > 0) || profile.relationship_type ? (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 shadow-sm border border-primary/20">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  {t('common.lookingFor')}
                </h3>
                <div className="space-y-2">
                  {profile.looking_for && profile.looking_for.length > 0 && (
                    <div className="text-base font-medium text-primary">
                      {profile.looking_for.map((item) => getGenderLabel(item)).join(", ")}
                    </div>
                  )}
                  {profile.relationship_type && (
                    <div className="text-sm text-muted-foreground">
                      {getRelationshipTypeLabel(profile.relationship_type)}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Interests Section */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-4">{t('common.interests')}</h3>
                <div className="flex flex-wrap gap-2">
                  {(translatedInterests.length > 0 ? translatedInterests : profile.interests).map((interest, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            {photoUrls.length > 0 && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-4">Galleria Foto</h3>
                <div className="grid grid-cols-3 gap-3">
                  {photoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {!hasLiked && !hasActiveMatch && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 text-base font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  disabled={isLiking}
                >
                  <Heart className="h-5 w-5 mr-2" />
                  Mi Piace
                </Button>
              )}
              <Button
                variant="default"
                size="lg"
                className={`${hasLiked || hasActiveMatch ? 'w-full' : 'flex-1'} h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/80`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChat();
                }}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {t("explore.chatButton")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95">
            <div className="relative">
              <img
                src={selectedImage || ""}
                alt="Foto ingrandita"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <ChatConfirmationBanner
        isVisible={showChatConfirmation}
        onClose={() => setShowChatConfirmation(false)}
        onConfirm={handleConfirmChat}
        userName={profile?.nickname || profile?.full_name}
        isLoading={isCreatingChat}
      />
    </>
  );
};
