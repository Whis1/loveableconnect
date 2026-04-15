import { useState, useEffect, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import { ProfileDialog } from "./ProfileDialog";
import { getGenericLocationPhrase } from "@/lib/utils";
import { useDailyLikes } from "@/hooks/useDailyLikes";
import { useCredits } from "@/hooks/useCredits";
import { useSendLike } from "@/hooks/useSendLike";
import { useWeeklyFreeChats } from "@/hooks/useWeeklyFreeChats";
import { DailyLikesExhaustedBanner } from "./DailyLikesExhaustedBanner";
import { ChatConfirmationBanner } from "./ChatConfirmationBanner";
import { SpotifySongCard } from "./SpotifySongCard";
import { InsufficientCreditsBanner } from "@/components/chat/InsufficientCreditsBanner";
import OnlineIndicator from "./OnlineIndicator";

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  relationship_type: string | null;
  looking_for: string[] | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  distance?: number;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
  favorite_songs?: any[] | null;
}

interface ProfileGridCardProps {
  profile: Profile;
  currentUserId: string;
  likedProfileIds?: Set<string>;
  hasActiveMatch?: boolean; // Pre-caricato da pagina parent
  onlineStatus?: { isOnline: boolean; showStatus: boolean }; // Pre-caricato da pagina parent
  onLike: (profileId: string) => void;
  onMatch?: (profileName: string, profileAvatar: string | null) => void;
}

const ProfileGridCardComponent = ({ profile, currentUserId, likedProfileIds, hasActiveMatch = false, onlineStatus, onLike, onMatch }: ProfileGridCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(likedProfileIds?.has(profile.id) || false);
  // hasActiveMatch ora viene passato come prop, non più calcolato qui
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showLikesExhausted, setShowLikesExhausted] = useState(false);
  const [showChatConfirmation, setShowChatConfirmation] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string>('');
  const { translateText } = useTextTranslation();
  const { likesRemaining, resetAt } = useDailyLikes();
  const { credits } = useCredits();
  const { sendLike } = useSendLike(currentUserId);
  const { chatsRemaining, consumeFreeChat } = useWeeklyFreeChats();

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return t('common.notSpecified');
    const key = gender.toLowerCase();
    const genderMap: Record<string, string> = {
      male: t('common.male'),
      uomo: t('common.male'),
      female: t('common.female'),
      donna: t('common.female'),
      transgender: t('common.transgender'),
      trans: t('common.transgender'),
      transexual: t('common.transexual'),
      transessuale: t('common.transexual'),
      genderfluid: t('common.genderfluid'),
      "non-binary": t('common.nonBinary'),
      "non binario": t('common.nonBinary'),
      other: t('common.other'),
      altro: t('common.other'),
    };
    return genderMap[key] || gender;
  };

  const getOrientationLabel = (orientation: string | null) => {
    if (!orientation) return t('common.notSpecified');
    const key = orientation.toLowerCase();
    const orientationMap: Record<string, string> = {
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
    return orientationMap[key] || orientation;
  };

  const getRelationshipStatusLabel = (status: string | null) => {
    if (!status) return t('common.notSpecified');
    const statusMap: Record<string, string> = {
      single: t('common.single'),
      in_relationship: t('common.inRelationship'),
      fidanzato: t('common.inRelationship'),
      fidanzata: t('common.inRelationship'),
      'fidanzato/a': t('common.inRelationship'),
      married: t('common.married'),
      sposato: t('common.married'),
      sposata: t('common.married'),
      'sposato/a': t('common.married'),
      divorced: t('common.divorced'),
      divorziato: t('common.divorced'),
      divorziata: t('common.divorced'),
      'divorziato/a': t('common.divorced'),
      widowed: t('common.widowed'),
      vedovo: t('common.widowed'),
      vedova: t('common.widowed'),
      'vedovo/a': t('common.widowed'),
      prefer_not_say: t('common.preferNotSay'),
      preferisco_non_dirlo: t('common.preferNotSay'),
      scoprilo: t('common.notSpecified'),
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const getRelationshipTypeLabel = (type: string | null | undefined) => {
    if (!type) return '';
    const key = type.toLowerCase();
    const labels: Record<string, string> = {
      serious: t('profile.seriousRelationship'),
      'relazione seria': t('profile.seriousRelationship'),
      'serious relationship': t('profile.seriousRelationship'),
      casual: t('profile.casualDating'),
      'incontri casuali': t('profile.casualDating'),
      'casual dating': t('profile.casualDating'),
      friendship: t('profile.friendship'),
      amicizia: t('profile.friendship'),
      open: t('common.openRelationship'),
      'relazione aperta': t('common.openRelationship'),
      'open relationship': t('common.openRelationship'),
      'prefer-not-say': t('common.preferNotSay'),
      'prefer_not_say': t('common.preferNotSay'),
      'preferisco non dirlo': t('common.preferNotSay'),
      'preferisco_non_dirlo': t('common.preferNotSay'),
      'not-sure': t('common.notSure'),
      'not_sure': t('common.notSure'),
      'not sure': t('common.notSure'),
      'non specifico': t('common.notSure'),
    };
    return labels[key] || type;
  };

  const getLookingForLabel = (profile: Profile) => {
    const hasLookingFor = profile.looking_for && profile.looking_for.length > 0;
    const hasRelationshipType = profile.relationship_type;
    
    if (!hasLookingFor && !hasRelationshipType) {
      return t('common.notSpecified');
    }
    
    const parts: string[] = [];
    
    if (hasLookingFor) {
      parts.push(profile.looking_for!.map((item) => getGenderLabel(item)).join(", "));
    }
    
    if (hasRelationshipType) {
      parts.push(getRelationshipTypeLabel(profile.relationship_type));
    }
    
    return parts.join(" • ");
  };

  // Aggiorna hasLiked solo quando cambiano likedProfileIds (più veloce)
  useEffect(() => {
    if (likedProfileIds) {
      setHasLiked(likedProfileIds.has(profile.id));
    }
  }, [likedProfileIds, profile.id]);

  // Use pre-translated bio if available, otherwise translate on mount
  useEffect(() => {
    const loadTranslation = async () => {
      if (profile.translatedBio) {
        setTranslatedBio(profile.translatedBio);
      } else if (profile.bio) {
        const translated = await translateText(profile.bio);
        setTranslatedBio(translated);
      }
    };
    loadTranslation();
  }, [profile.bio, profile.translatedBio]);

  const avatarUrl = profile.avatar_url
    ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  // Preload avatar per rendering più veloce
  useEffect(() => {
    if (avatarUrl) {
      const img = new Image();
      img.src = avatarUrl;
    }
  }, [avatarUrl]);

  const hasPremiumDirectChat = Boolean(
    credits?.is_premium &&
    credits.subscription_type === "monthly" &&
    credits.premium_tier === "premium" &&
    (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())
  );

  const handleLike = async (e: React.MouseEvent, useCredits: boolean = false) => {
    e.stopPropagation();

    if (hasLiked || isLiking) return;

    setIsLiking(true);
    setHasLiked(true); // Optimistic — will be rolled back on failure

    try {
      const result = await sendLike(profile.id, useCredits);

      if (!result.success) {
        setHasLiked(false);
        if (result.likes_remaining <= 0 && !useCredits) {
          setShowLikesExhausted(true);
        } else {
          setShowCreditsBanner(true);
        }
        return;
      }

      if (result.match_created && onMatch) {
        const matchAvatar = profile.avatar_url && /^https?:\/\//.test(profile.avatar_url)
          ? profile.avatar_url
          : (profile.avatar_url
            ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl
            : null);
        onMatch(profile.nickname || profile.full_name, matchAvatar);
      } else if (!result.already_exists) {
        toast({
          title: t('search.likeSent'),
          description: `${t('search.likedProfile')} ${profile.nickname || profile.full_name}`,
        });
      }
    } catch (error: any) {
      setHasLiked(false);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleUseCreditsForLike = async () => {
    setShowLikesExhausted(false);

    if ((credits?.balance ?? 0) < 2) {
      setShowCreditsBanner(true);
      return;
    }

    await handleLike({ stopPropagation: () => {} } as React.MouseEvent, true);
  };

  const handleChat = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (showChatConfirmation || isCreatingChat) return;

    if (!hasActiveMatch) {
      if (hasPremiumDirectChat) {
        await handleConfirmChat();
      } else {
        setShowChatConfirmation(true);
      }
      return;
    }

    setIsCreatingChat(true);

    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)
        .maybeSingle();

      if (matchError) throw matchError;

      if (matchData) {
        navigate(`/chat/${matchData.id}`);
        return;
      }

      if (hasPremiumDirectChat) {
        await handleConfirmChat();
        return;
      }

      setShowChatConfirmation(true);
    } catch (error: any) {
      console.error("handleChat error:", error);
      toast({
        title: t("common.error"),
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsCreatingChat(false);
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

      // 1) Check if a match already exists (no charge)
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)
        .maybeSingle();

      if (existingMatch) {
        setShowChatConfirmation(false);
        navigate(`/chat/${existingMatch.id}`);
        return;
      }

      // 2) Quick credit check BEFORE creating match (use cached data)
      const isPremiumTier = credits?.subscription_type === 'monthly' && credits?.premium_tier === 'premium';
      const chatCostCredits = isPremiumTier ? 0 : (chatsRemaining > 0 ? 0 : 6);

      if (chatCostCredits > 0 && (!credits || credits.balance < chatCostCredits)) {
        setShowChatConfirmation(false);
        setShowCreditsBanner(true);
        setIsCreatingChat(false);
        return;
      }

      // 3) Create the match
      const user1Id = currentUserId < profile.id ? currentUserId : profile.id;
      const user2Id = currentUserId < profile.id ? profile.id : currentUserId;

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({ user1_id: user1Id, user2_id: user2Id })
        .select('id')
        .single();

      if (matchError) {
        const code = (matchError as any)?.code;
        if (code === '23505') {
          const { data: m } = await supabase
            .from("matches")
            .select("id")
            .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
            .maybeSingle();
          if (m) {
            setShowChatConfirmation(false);
            navigate(`/chat/${m.id}`);
            return;
          }
        }
        throw matchError;
      }

      const createdMatchId = matchData.id as string;

      // 4) Navigate IMMEDIATELY — handle costs in background
      setShowChatConfirmation(false);
      navigate(`/chat/${createdMatchId}`);

      // Fire-and-forget: deduct credits or consume free chat
      (async () => {
        try {
          if (isPremiumTier) return;
          
          if (chatsRemaining > 0) {
            await consumeFreeChat();
          } else if (chatCostCredits > 0) {
            const { data: deductSuccess, error: deductError } = await supabase.rpc(
              'deduct_credits',
              { _user_id: session.user.id, _amount: chatCostCredits }
            );
            if (deductError || !deductSuccess) {
              console.error('Background credit deduction failed:', deductError);
            }
          }
          queryClient.invalidateQueries({ queryKey: ["user-credits"] });
          queryClient.invalidateQueries({ queryKey: ["weekly-free-chats"] });
        } catch (err) {
          console.error('Background cost handling error:', err);
        }
      })();
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

            {/* Online Indicator */}
            <div className="absolute top-3 left-3">
              <OnlineIndicator userId={profile.id} size="lg" preloadedStatus={onlineStatus} />
            </div>

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
                {profile.nickname.length > 12 
                  ? `${profile.nickname.substring(0, 12)}...` 
                  : profile.nickname}
              </h3>
              {profile.age && (
                <span className="text-base text-muted-foreground font-medium">
                  {profile.age} {t('userProfile.years')}
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
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {getGenderLabel(profile.gender)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                {getOrientationLabel(profile.sexual_orientation)}
              </span>
            </div>

            {/* Relationship Status & Looking For */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">{t("explore.statusLabel")}</span> {getRelationshipStatusLabel(profile.relationship_status)}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">{t("explore.lookingForLabel")}</span> {getLookingForLabel(profile)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">{/* ... keep existing code */}
              {!hasLiked && !hasActiveMatch && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs"
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  <Heart className="h-3.5 w-3.5 mr-1" />
                  {t("explore.likeButton")}
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                className={`${hasLiked || hasActiveMatch ? 'w-full' : 'flex-1'} h-9 text-xs bg-gradient-to-r from-primary to-primary/80`}
                onClick={handleChat}
                disabled={isCreatingChat}
              >
                {isCreatingChat ? (
                  <span className="h-3.5 w-3.5 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                )}
                {t("explore.chatButton")}
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
      
      <DailyLikesExhaustedBanner
        open={showLikesExhausted}
        onOpenChange={setShowLikesExhausted}
        onUseCredits={handleUseCreditsForLike}
        resetAt={resetAt}
      />
      
      <ChatConfirmationBanner
        isVisible={showChatConfirmation}
        onClose={() => setShowChatConfirmation(false)}
        onConfirm={handleConfirmChat}
        userName={profile.nickname || profile.full_name}
        isLoading={isCreatingChat}
      />

      <InsufficientCreditsBanner isVisible={showCreditsBanner} onClose={() => setShowCreditsBanner(false)} />
    </>
  );
};

// Esporta versione memoizzata per performance
export const ProfileGridCard = memo(ProfileGridCardComponent);
