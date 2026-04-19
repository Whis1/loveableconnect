import { useState, useEffect, memo } from "react";
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
  const { chatsRemaining } = useWeeklyFreeChats();

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

    // Premium con direct chat o match già attivo: apri direttamente la chat
    if (hasActiveMatch || hasPremiumDirectChat) {
      await handleConfirmChat();
      return;
    }

    setShowChatConfirmation(true);
  };

  const handleConfirmChat = async () => {
    if (isCreatingChat) return;

    const isPremiumTier = credits?.subscription_type === 'monthly' && credits?.premium_tier === 'premium';
    const isFreeChat = isPremiumTier || chatsRemaining > 0;
    const chatCostCredits = isFreeChat ? 0 : 6;

    if (chatCostCredits > 0 && (!credits || credits.balance < chatCostCredits)) {
      setShowChatConfirmation(false);
      setShowCreditsBanner(true);
      return;
    }

    setIsCreatingChat(true);

    try {
      // 1) Resolve or create the match BEFORE navigating
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
        _other_user_id: profile.id,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : (data as any);
      const matchId = row?.match_id as string | undefined;
      const wasCreated = Boolean(row?.was_created);

      if (!matchId) throw new Error('Impossibile aprire la chat');

      // 2) Settle the cost in the background (non-blocking)
      if (wasCreated) {
        if (isPremiumTier) {
          // free for premium
        } else if (chatsRemaining > 0) {
          void supabase.rpc('consume_free_chat', { _user_id: currentUserId });
        } else {
          void supabase.rpc('deduct_credits', { _user_id: currentUserId, _amount: chatCostCredits });
        }
      }

      // 3) Navigate to /matches — the chat is already created and visible there.
      // The user can then tap it to enter (avoids the stuck-loading issue on direct /chat/:id nav).
      setShowChatConfirmation(false);
      navigate('/matches');
    } catch (err: any) {
      console.error('handleConfirmChat error:', err);
      toast({
        title: t('common.error'),
        description: err?.message || 'Impossibile aprire la chat',
        variant: 'destructive',
      });
    } finally {
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
