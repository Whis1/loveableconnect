import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import { ProfileDialog } from "./ProfileDialog";
import { getGenericLocationPhrase, calculateAge } from "@/lib/utils";
import { useDailyLikes } from "@/hooks/useDailyLikes";
import { useCredits } from "@/hooks/useCredits";
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
  onLike: (profileId: string) => void;
  onMatch?: (profileName: string) => void;
}

export const ProfileGridCard = ({ profile, currentUserId, likedProfileIds, onLike, onMatch }: ProfileGridCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showLikesExhausted, setShowLikesExhausted] = useState(false);
  const [showChatConfirmation, setShowChatConfirmation] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string>('');
  const { translateText } = useTextTranslation();
  const { consumeLike, likesRemaining, resetAt } = useDailyLikes();
  const { credits } = useCredits();
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

  // Check if user already liked this profile or has an active match
  useEffect(() => {
    const checkLikeAndMatch = async () => {
      // Se abbiamo già i like pre-caricati, usali
      if (likedProfileIds) {
        setHasLiked(likedProfileIds.has(profile.id));
      } else {
        // Fallback: carica dal database solo se necessario
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("from_user_id", currentUserId)
          .eq("to_user_id", profile.id)
          .maybeSingle();
        
        setHasLiked(!!likeData);
      }

      // Check for match
      const { data: matchData } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)
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
    
    checkLikeAndMatch();

    // Subscribe to changes in likes and matches
    const likesChannel = supabase
      .channel(`likes-${currentUserId}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `from_user_id=eq.${currentUserId}`
        },
        () => checkLikeAndMatch()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => checkLikeAndMatch()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hidden_matches'
        },
        () => checkLikeAndMatch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [currentUserId, profile.id, likedProfileIds]);

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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking || hasLiked) return;

    setIsLiking(true);
    setHasLiked(true); // feedback immediato

    try {
      // Chiamata atomica: scala 2 crediti e inserisce like
      const { data, error } = await supabase.rpc('like_with_credits', {
        _to_user_id: profile.id,
        _cost: 2,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        // rollback
        setHasLiked(false);
        if (credits?.balance < 2) {
          toast({ title: t('common.error'), description: 'Crediti insufficienti', variant: 'destructive' });
        } else {
          setShowLikesExhausted(true);
        }
        return;
      }

      onLike?.(profile.id);

      if (result.match_created && onMatch) {
        onMatch(profile.nickname || profile.full_name);
      } else if (!result.already_exists) {
        toast({ title: t('search.likeSent'), description: `${t('search.likedProfile')} ${profile.nickname || profile.full_name}` });
      }

    } catch (err: any) {
      console.error('Errore like_with_credits:', err);
      setHasLiked(false);
      toast({ title: t('common.error'), description: 'Impossibile inviare il like', variant: 'destructive' });
    } finally {
      setIsLiking(false);
    }
  };
  const handleUseCreditsForLike = async () => {
    setShowLikesExhausted(false);
    await handleLike({ stopPropagation: () => {} } as React.MouseEvent);
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

      // Check if user has free chats available (weekly premium)
      let chatCostCredits = 6;
      if (chatsRemaining > 0) {
        // Try to consume a free chat
        const { success } = await consumeFreeChat();
        if (success) {
          chatCostCredits = 0; // No credits needed
          toast({
            title: "Chat Gratis Usata!",
            description: `Chat gratis rimanenti oggi: ${chatsRemaining - 1}`,
          });
        }
      }

      // If no free chat used, check credits
      if (chatCostCredits > 0) {
        if (!credits || credits.balance < chatCostCredits) {
          setShowChatConfirmation(false);
          setShowCreditsBanner(true);
          setIsCreatingChat(false);
          return;
        }

        // Deduct credits
        const { data: deductSuccess, error: deductError } = await supabase.rpc(
          "deduct_credits",
          { _user_id: session.user.id, _amount: chatCostCredits }
        );

        if (deductError || !deductSuccess) {
          setShowCreditsBanner(true);
          setShowChatConfirmation(false);
          setIsCreatingChat(false);
          return;
        }
      }

      // Create match
      const user1Id = currentUserId < profile.id ? currentUserId : profile.id;
      const user2Id = currentUserId < profile.id ? profile.id : currentUserId;

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
        description: `Ora puoi chattare con ${profile.nickname || profile.full_name}!`,
      });

      setShowChatConfirmation(false);
      setIsCreatingChat(false);
      
      // Navigate to chat
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
              <OnlineIndicator userId={profile.id} size="lg" />
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
              {profile.birthdate && (
                <span className="text-base text-muted-foreground font-medium">
                  {calculateAge(profile.birthdate)} {t('userProfile.years')}
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
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
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
        hasEnoughCredits={(credits?.balance ?? 0) >= 2}
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
