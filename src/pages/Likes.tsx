import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useTextTranslation } from "@/hooks/useTranslation";
import { MatchBanner } from "@/components/MatchBanner";
import likesHeartIcon from "@/assets/likes-heart-icon.png";
import likesBackground from "@/assets/likes-background.png";

interface LikeWithProfile {
  id: string;
  from_user_id: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    nickname: string;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    interests: string[] | null;
    gender: string | null;
    sexual_orientation: string | null;
    relationship_status: string | null;
    relationship_type: string | null;
    looking_for: string[] | null;
    translatedBio?: string | null;
    translatedInterests?: string[] | null;
    translatedGender?: string | null;
    translatedOrientation?: string | null;
    translatedRelationshipType?: string | null;
    translatedLookingFor?: string[] | null;
  };
}

// Helper function to normalize gender/orientation values to standard codes
const normalizeValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  
  // Gender mappings
  const genderMap: Record<string, string> = {
    'male': 'male', 'man': 'male', 'uomo': 'male', 'homme': 'male', 'mann': 'male', 'hombre': 'male',
    'female': 'female', 'woman': 'female', 'donna': 'female', 'femme': 'female', 'frau': 'female', 'mujer': 'female',
    'non-binary': 'non-binary', 'nonbinary': 'non-binary', 'non binario': 'non-binary', 'nicht-binär': 'non-binary',
    'transexual': 'transexual', 'transessuale': 'transexual', 'transsexuell': 'transexual',
    'transgender': 'transgender', 'transgenre': 'transgender',
    'genderfluid': 'genderfluid', 'genre fluide': 'genderfluid'
  };
  
  // Orientation mappings
  const orientationMap: Record<string, string> = {
    'heterosexual': 'heterosexual', 'eterosessuale': 'heterosexual', 'hétérosexuel': 'heterosexual', 'heterosexuell': 'heterosexual',
    'homosexual': 'homosexual', 'omosessuale': 'homosexual', 'homosexuel': 'homosexual', 'homosexuell': 'homosexual',
    'bisexual': 'bisexual', 'bisessuale': 'bisexual', 'bisexuel': 'bisexual', 'bisexuell': 'bisexual',
    'pansexual': 'pansexual', 'pansessuale': 'pansexual', 'pansexuel': 'pansexual', 'pansexuell': 'pansexual',
    'asexual': 'asexual', 'asessuale': 'asexual', 'asexuel': 'asexual', 'asexuell': 'asexual',
    'other': 'other', 'altro': 'other', 'autre': 'other', 'sonstiges': 'other'
  };
  
  // Relationship status mappings
  const relationshipStatusMap: Record<string, string> = {
    'single': 'single', 'singolo': 'single', 'célibataire': 'single', 'ledig': 'single',
    'in relationship': 'in_relationship', 'in_relationship': 'in_relationship', 'in una relazione': 'in_relationship',
    'married': 'married', 'sposato': 'married', 'marié': 'married', 'verheiratet': 'married',
    'divorced': 'divorced', 'divorziato': 'divorced', 'divorcé': 'divorced', 'geschieden': 'divorced',
    'widowed': 'widowed', 'vedovo': 'widowed', 'veuf': 'widowed', 'verwitwet': 'widowed',
    'prefer not say': 'prefer_not_say', 'prefer_not_say': 'prefer_not_say', 'preferisco non dire': 'prefer_not_say'
  };
  
  // Relationship type mappings
  const relationshipMap: Record<string, string> = {
    'serious': 'serious', 'seria': 'serious', 'sérieuse': 'serious', 'ernsthafte': 'serious',
    'casual': 'casual', 'occasionale': 'casual', 'occasionnel': 'casual', 'zwanglos': 'casual',
    'friendship': 'friendship', 'amicizia': 'friendship', 'amitié': 'friendship', 'freundschaft': 'friendship',
    'not-sure': 'not-sure', 'non sono sicuro': 'not-sure', 'pas sûr': 'not-sure', 'unsicher': 'not-sure'
  };
  
  // Try all mappings
  return genderMap[normalized] || orientationMap[normalized] || relationshipStatusMap[normalized] || relationshipMap[normalized] || null;
};

const toPublicAvatarUrl = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
};

const Likes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { translateText, translateArray, currentLanguage } = useTextTranslation();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [matchBanner, setMatchBanner] = useState<{ show: boolean; userName: string }>({
    show: false,
    userName: "",
  });
  const [likingUserId, setLikingUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      // Check if user is premium
      const { data: creditsData } = await supabase
        .from("user_credits")
        .select("is_premium, premium_expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const userIsPremium = creditsData?.is_premium && 
        (!creditsData.premium_expires_at || new Date(creditsData.premium_expires_at) > new Date());

      setIsPremium(!!userIsPremium);

      // Check if user has unlocked likes (or is premium)
      const { data: unlockData } = await supabase
        .from("likes_unlocked")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Check if unlock is still valid (not expired)
      const unlockIsValid = unlockData && 
        (!unlockData.expires_at || new Date(unlockData.expires_at) > new Date());

      // User has access if premium OR has valid unlock
      setHasUnlocked(!!userIsPremium || !!unlockIsValid);
      setCheckingUnlock(false);

      // Fetch likes
      const { data: likesData, error } = await supabase
        .from("likes")
        .select("id, from_user_id, created_at")
        .eq("to_user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching likes:", error);
        toast({
          title: t("likes.error"),
          description: t("likes.errorLoadingLikes"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch profiles for each like and translate
      const likesWithProfiles = await Promise.all(
        (likesData || []).map(async (like) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, nickname, avatar_url, bio, age, interests, gender, sexual_orientation, relationship_status, relationship_type, looking_for")
            .eq("id", like.from_user_id)
            .single();

          if (profile) {
            // Translate bio and interests
            const translatedBio = profile.bio ? await translateText(profile.bio) : null;
            const translatedInterests = profile.interests ? await translateArray(profile.interests) : null;
            const translatedLookingFor = profile.looking_for ? await translateArray(profile.looking_for) : null;

            // Normalize and translate gender, orientation, relationship_type
            const genderCodes = ['male','female','non-binary','transexual','transgender','genderfluid'];
            const orientationCodes = ['heterosexual','homosexual','bisexual','pansexual','asexual','other'];
            const relationshipTypeCodes = ['serious','casual','friendship','not-sure','prefer-not-say'];

            const translatedGender = profile.gender && !genderCodes.includes(profile.gender)
              ? await translateText(profile.gender)
              : null;
            const translatedOrientation = profile.sexual_orientation && !orientationCodes.includes(profile.sexual_orientation)
              ? await translateText(profile.sexual_orientation)
              : null;
            const translatedRelationshipType = profile.relationship_type && !relationshipTypeCodes.includes(profile.relationship_type)
              ? await translateText(profile.relationship_type)
              : null;

            return {
              id: like.id,
              from_user_id: like.from_user_id,
              created_at: like.created_at,
              profile: {
                ...profile,
                avatar_url: toPublicAvatarUrl(profile.avatar_url),
                translatedBio,
                translatedInterests,
                translatedGender,
                translatedOrientation,
                translatedRelationshipType,
                translatedLookingFor,
              },
            };
          }

          return {
            id: like.id,
            from_user_id: like.from_user_id,
            created_at: like.created_at,
            profile: {
              id: like.from_user_id,
              full_name: t("likes.unknownUser"),
              nickname: t("likes.unknownUser"),
              avatar_url: null,
              bio: null,
              age: null,
              interests: null,
              gender: null,
              sexual_orientation: null,
              relationship_status: null,
              relationship_type: null,
              looking_for: null,
            },
          };
        })
      );

      setLikes(likesWithProfiles);
      setLoading(false);
    };

    fetchData();
  }, [navigate, toast, currentLanguage, translateText, translateArray, t]);

  const handleUnlockLikes = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-unlock-payment');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
    } catch (error: any) {
      toast({
        title: t("likes.error"),
        description: t("likes.errorStartingPayment"),
        variant: "destructive",
      });
    }
  };

  // Verify unlock payment after redirect
  useEffect(() => {
    const verifyUnlock = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      const unlockStatus = params.get('unlock');
      
      if (sessionId && currentUserId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-unlock-payment', {
            body: { session_id: sessionId }
          });

          if (error) throw error;

          if (data.success) {
            toast({
              title: t("likes.paymentCompleted"),
              description: t("likes.paymentCompletedDescription"),
            });
            setHasUnlocked(true);
          } else {
            toast({
              title: t("likes.error"),
              description: t("likes.paymentNotCompleted"),
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error verifying unlock:", error);
          toast({
            title: t("likes.error"),
            description: t("likes.errorVerifyingPayment"),
            variant: "destructive",
          });
        }
        
        window.history.replaceState({}, '', '/likes');
      } else if (unlockStatus === 'cancel') {
        toast({
          title: t("likes.paymentCancelled"),
          description: t("likes.paymentCancelledDescription"),
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/likes');
      }
    };

    verifyUnlock();

    // Realtime listener for deleted likes (when matches are created)
    const likesDeleteChannel = supabase
      .channel('likes-page-delete-channel')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'likes',
        },
        async (payload) => {
          const deletedLike = payload.old as any;
          if (deletedLike.to_user_id === currentUserId) {
            // A like received by this user was deleted, remove it from the list
            setLikes(prev => prev.filter(like => like.id !== deletedLike.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesDeleteChannel);
    };
  }, [toast, currentUserId, t]);

  const handleLikeBack = async (likeId: string, userId: string, userName: string) => {
    if (!currentUserId || likingUserId) return;
    
    setLikingUserId(userId);

    try {
      // Check if there's already a like from this user to the other user
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", userId)
        .maybeSingle();

      if (existingLike) {
        toast({
          title: t("search.likeSent"),
          description: t("search.likedProfile") + " " + userName,
        });
        setLikingUserId(null);
        return;
      }

      // Use the edge function to handle the like properly
      const { data, error } = await supabase.functions.invoke('admin-manage-like', {
        body: {
          action: 'add',
          fromUserId: currentUserId,
          toUserId: userId
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to like back');
      }

      // Check if a match was created
      if (data.match_created) {
        // Match was created! Show banner
        setMatchBanner({ show: true, userName });
        
        // Remove this like from the list
        setLikes((prev) => prev.filter((l) => l.id !== likeId));
      } else {
        toast({
          title: t("search.likeSent"),
          description: t("search.likedProfile") + " " + userName,
        });
      }
    } catch (error) {
      console.error("Error liking back:", error);
      toast({
        title: t("likes.error"),
        description: t("likes.errorLikingBack"),
        variant: "destructive",
      });
    } finally {
      setLikingUserId(null);
    }
  };

  if (loading || checkingUnlock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("likes.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/50 dark:to-indigo-900/50 p-4">
      {matchBanner.show && (
        <MatchBanner
          matchedUserName={matchBanner.userName}
          onClose={() => setMatchBanner({ show: false, userName: "" })}
        />
      )}
      
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("likes.back")}
          </Button>
        </div>

        <Card className="border-0 shadow-2xl bg-background/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                <img src={likesHeartIcon} alt="Likes" className="h-7 w-7 object-contain" />
              </div>
              {t("likes.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasUnlocked && !isPremium && likes.length > 0 && (
              <div className="p-8 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 dark:from-purple-500/20 dark:via-pink-500/20 dark:to-rose-500/20 rounded-2xl text-center border border-purple-200/50 dark:border-purple-500/30 shadow-lg">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-xl">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {t("likes.unlockTitle")}
                </h3>
                <p className="text-base text-foreground/70 mb-6 max-w-md mx-auto">
                  {t("likes.unlockMessage", { count: likes.length })}
                </p>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl transition-all duration-300 text-base px-8 py-6 h-auto"
                  onClick={handleUnlockLikes}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {t("likes.unlockNow")}
                </Button>
              </div>
            )}

            {likes.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="inline-flex p-6 rounded-full bg-muted/50 mb-4">
                  <Heart className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  {t("likes.noLikes")}
                </p>
                <Button 
                  onClick={() => navigate("/explore")}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("likes.exploreProfiles")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {likes.map((like) => (
                  <Card 
                    key={like.id} 
                    className={`overflow-hidden transition-all duration-300 hover:shadow-xl border-0 bg-cover bg-center ${!hasUnlocked ? 'relative' : ''}`}
                    style={{ backgroundImage: `url(${likesBackground})` }}
                  >
                    {!hasUnlocked && (
                      <div className="absolute inset-0 backdrop-blur-md bg-background/40 z-10 flex items-center justify-center">
                        <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl">
                          <Lock className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    <CardContent className="p-5 bg-background/80 backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-20 w-20 ring-2 ring-primary/20 shadow-lg">
                            <AvatarImage 
                              src={like.profile.avatar_url || undefined} 
                            />
                            <AvatarFallback className="text-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                              {hasUnlocked ? (like.profile.nickname?.charAt(0) || like.profile.full_name.charAt(0)) : '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xl truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {hasUnlocked ? like.profile.nickname : '???'}
                            </h3>
                            {hasUnlocked && (
                              <img src={likesHeartIcon} alt="Like" className="h-5 w-5 md:h-6 md:w-6 object-contain shrink-0" />
                            )}
                          </div>
                          {hasUnlocked && like.profile.age && (
                            <p className="text-sm text-muted-foreground font-medium">
                              {like.profile.age} {t("common.years")}
                            </p>
                          )}
                          
                          {/* Info aggiuntive: genere, orientamento, stato, cerca */}
                          {hasUnlocked && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
                              <div className="flex items-start gap-1">
                                <span className="font-medium text-foreground/70">{t("common.gender")}</span>
                                <span className="text-muted-foreground">
                                  {like.profile.gender ? (() => {
                                    const normalized = normalizeValue(like.profile.gender);
                                    switch(normalized) {
                                      case 'male': return t("common.male");
                                      case 'female': return t("common.female");
                                      case 'non-binary': return t("common.nonBinary");
                                      case 'transexual': return t("common.transexual");
                                      case 'transgender': return t("common.transgender");
                                      case 'genderfluid': return t("common.genderfluid");
                                      default: return like.profile.translatedGender || like.profile.gender;
                                    }
                                  })() : "Non specificato"}
                                </span>
                              </div>
                             
                              <div className="flex items-start gap-1">
                                <span className="font-medium text-foreground/70">{t("common.orientation")}</span>
                                <span className="text-muted-foreground">
                                  {like.profile.sexual_orientation ? (() => {
                                    const normalized = normalizeValue(like.profile.sexual_orientation);
                                    switch(normalized) {
                                      case 'heterosexual': return t("common.heterosexual");
                                      case 'homosexual': return t("common.homosexual");
                                      case 'bisexual': return t("common.bisexual");
                                      case 'pansexual': return t("common.pansexual");
                                      case 'asexual': return t("common.asexual");
                                      case 'other': return t("common.other");
                                      default: return like.profile.translatedOrientation || like.profile.sexual_orientation;
                                    }
                                  })() : "Non specificato"}
                                </span>
                              </div>
                             
                              <div className="flex items-start gap-1">
                                <span className="font-medium text-foreground/70">{t("common.relationshipStatus")}</span>
                                <span className="text-muted-foreground">
                                  {like.profile.relationship_status ? (() => {
                                    const normalized = normalizeValue(like.profile.relationship_status);
                                    switch(normalized) {
                                      case 'single': return t("common.single");
                                      case 'in_relationship': return t("common.inRelationship");
                                      case 'married': return t("common.married");
                                      case 'divorced': return t("common.divorced");
                                      case 'widowed': return t("common.widowed");
                                      case 'prefer_not_say': return t("common.preferNotSay");
                                      default: return like.profile.relationship_status;
                                    }
                                  })() : "Non specificato"}
                                </span>
                              </div>
                             
                              <div className="flex items-start gap-1">
                                <span className="font-medium text-foreground/70">{t("common.lookingFor")}</span>
                                <span className="text-muted-foreground">
                                  {like.profile.looking_for && like.profile.looking_for.length > 0 
                                    ? (like.profile.translatedLookingFor?.join(", ") || like.profile.looking_for.join(", "))
                                    : "Non specificato"}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {hasUnlocked && like.profile.translatedBio && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                              {like.profile.translatedBio}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-3 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {t("likes.likeReceived")} {new Date(like.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {hasUnlocked && (
                          <Button 
                            onClick={() => handleLikeBack(like.id, like.from_user_id, like.profile.nickname)}
                            disabled={likingUserId === like.from_user_id}
                            className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
                          >
                            <Heart className={`h-4 w-4 mr-2 ${likingUserId === like.from_user_id ? '' : 'fill-white'}`} />
                            {likingUserId === like.from_user_id ? t("likes.liking") : t("likes.likeBack")}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Likes;
