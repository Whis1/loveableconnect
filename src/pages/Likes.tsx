import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Lock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import { MatchBanner } from "@/components/MatchBanner";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import likesHeartIcon from "@/assets/likes-heart-icon.png";
import { useCredits } from "@/hooks/useCredits";
import { useSendLike } from "@/hooks/useSendLike";

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
  const { credits, refetch: refetchCredits } = useCredits();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());
  const [matchBanner, setMatchBanner] = useState<{ show: boolean; userName: string; userAvatar: string | null }>({
    show: false,
    userName: "",
    userAvatar: null,
  });
  const [likingUserId, setLikingUserId] = useState<string | null>(null);
  const { sendLike } = useSendLike(currentUserId);
  const [unlockingProfileId, setUnlockingProfileId] = useState<string | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Carica i like ricevuti con i profili associati, in modo robusto.
  const loadLikes = async (userId: string): Promise<LikeWithProfile[]> => {
    const { data: likesData, error } = await supabase
      .from("likes")
      .select("id, from_user_id, created_at")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = likesData || [];
    if (rows.length === 0) return [];

    // Un'unica query per tutti i profili: niente .single() per riga (falliva a caso).
    const fromIds = [...new Set(rows.map((l) => l.from_user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, avatar_url, bio, age, interests, gender, sexual_orientation, relationship_status, relationship_type, looking_for")
      .in("id", fromIds);
    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    // Traduzioni resilienti: un errore di traduzione non rompe il caricamento.
    const safeText = async (txt: string | null) => {
      if (!txt) return null;
      try {
        return await translateText(txt);
      } catch {
        return txt;
      }
    };
    const safeArray = async (arr: string[] | null) => {
      if (!arr) return null;
      try {
        return await translateArray(arr);
      } catch {
        return arr;
      }
    };

    const genderCodes = ['male','female','non-binary','transexual','transgender','genderfluid'];
    const orientationCodes = ['heterosexual','homosexual','bisexual','pansexual','asexual','other'];
    const relationshipTypeCodes = ['serious','casual','friendship','not-sure','prefer-not-say'];

    return Promise.all(
      rows.map(async (like) => {
        const profile = profileMap.get(like.from_user_id);

        if (!profile) {
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
        }

        const translatedGender = profile.gender && !genderCodes.includes(profile.gender)
          ? await safeText(profile.gender)
          : null;
        const translatedOrientation = profile.sexual_orientation && !orientationCodes.includes(profile.sexual_orientation)
          ? await safeText(profile.sexual_orientation)
          : null;
        const translatedRelationshipType = profile.relationship_type && !relationshipTypeCodes.includes(profile.relationship_type)
          ? await safeText(profile.relationship_type)
          : null;

        return {
          id: like.id,
          from_user_id: like.from_user_id,
          created_at: like.created_at,
          profile: {
            ...profile,
            avatar_url: toPublicAvatarUrl(profile.avatar_url),
            translatedBio: await safeText(profile.bio),
            translatedInterests: await safeArray(profile.interests),
            translatedGender,
            translatedOrientation,
            translatedRelationshipType,
            translatedLookingFor: await safeArray(profile.looking_for),
          },
        };
      })
    );
  };

  // Caricamento iniziale (e ri-traduzione al cambio lingua).
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      if (cancelled) return;
      setCurrentUserId(session.user.id);

      const { data: unlockedData } = await supabase
        .from("unlocked_like_profiles")
        .select("unlocked_profile_id")
        .eq("user_id", session.user.id);
      if (!cancelled && unlockedData) {
        setUnlockedProfiles(new Set(unlockedData.map((u) => u.unlocked_profile_id)));
      }

      try {
        const result = await loadLikes(session.user.id);
        if (!cancelled) setLikes(result);
      } catch (e) {
        console.error("Error fetching likes:", e);
        if (!cancelled) {
          toast({
            title: t("likes.error"),
            description: t("likes.errorLoadingLikes"),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  // Aggiornamento in tempo reale quando arrivano o spariscono dei like.
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("likes-page-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
          filter: `to_user_id=eq.${currentUserId}`,
        },
        async () => {
          try {
            const result = await loadLikes(currentUserId);
            setLikes(result);
          } catch (e) {
            console.error("Error refreshing likes:", e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentLanguage]);

  const handleProfileClick = (profileId: string) => {
    // Il profilo potrebbe essere stato rimosso (match appena creato)
    const profileStillInLikes = likes.some(l => l.from_user_id === profileId);
    if (!profileStillInLikes) return;

    // Se è già sbloccato i dati sono già mostrati nella card: niente da fare.
    if (unlockedProfiles.has(profileId)) return;

    // Altrimenti mostra la finestra di sblocco.
    setSelectedProfileId(profileId);
    setShowUnlockDialog(true);
  };

  const handleUnlockProfile = async () => {
    if (!currentUserId || !selectedProfileId) return;

    // Check if user has enough credits
    if (!credits || credits.balance < 8) {
      toast({
        title: "Crediti insufficienti",
        description: "Non hai abbastanza crediti per visualizzare questo profilo.",
        variant: "destructive",
      });
      setShowUnlockDialog(false);
      return;
    }

    setUnlockingProfileId(selectedProfileId);

    try {
      // Deduct credits
      const { error: deductError } = await supabase.rpc("deduct_credits", {
        _user_id: currentUserId,
        _amount: 8,
      });

      if (deductError) throw deductError;

      // Insert unlock record
      const { error: unlockError } = await supabase
        .from("unlocked_like_profiles")
        .insert({
          user_id: currentUserId,
          unlocked_profile_id: selectedProfileId,
          credits_used: 8,
        });

      if (unlockError) throw unlockError;

      // Update local state
      setUnlockedProfiles(prev => new Set([...prev, selectedProfileId]));
      refetchCredits();

      toast({
        title: "Profilo sbloccato",
        description: "Hai sbloccato il profilo con successo!",
      });

      setShowUnlockDialog(false);
    } catch (error: any) {
      console.error("Error unlocking profile:", error);
      toast({
        title: "Errore",
        description: "Impossibile sbloccare il profilo. Riprova.",
        variant: "destructive",
      });
    } finally {
      setUnlockingProfileId(null);
    }
  };

  const handleLikeBack = async (likeId: string, userId: string, userName: string) => {
    if (!currentUserId || likingUserId) return;
    
    setLikingUserId(userId);

    try {
      const result = await sendLike(userId, false);

      if (!result.success) {
        toast({
          title: t("likes.error"),
          description: t("likes.errorLikingBack"),
          variant: "destructive",
        });
        return;
      }

      if (result.match_created) {
        const matchedLike = likes.find(l => l.from_user_id === userId);
        const userAvatar = matchedLike ? toPublicAvatarUrl(matchedLike.profile.avatar_url) : null;
        setMatchBanner({ show: true, userName, userAvatar });
        setLikes((prev) => prev.filter((l) => l.id !== likeId));
      } else if (!result.already_exists) {
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

  if (loading) {
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
          matchedUserAvatar={matchBanner.userAvatar}
          onClose={() => setMatchBanner({ show: false, userName: "", userAvatar: null })}
        />
      )}

      <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visualizza Profilo
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>Vuoi visualizzare questo profilo?</p>
              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-200/50">
                <p className="text-lg font-semibold text-foreground">Costo: 8 crediti</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crediti disponibili: {credits?.balance || 0}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleUnlockProfile}
              disabled={unlockingProfileId !== null || !credits || credits.balance < 8}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {unlockingProfileId ? "Sblocco..." : "Visualizza"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
            {likes.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-xl font-medium text-muted-foreground">
                  {t("likes.noLikes")}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {likes.map((like) => {
                  const isUnlocked = unlockedProfiles.has(like.from_user_id);
                  
                  return (
                    <Card 
                      key={like.id} 
                      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border border-border/50"
                      onClick={() => handleProfileClick(like.from_user_id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <Avatar className={`h-20 w-20 border-4 border-pink-200/50 dark:border-pink-800/50 ${!isUnlocked ? 'blur-sm' : ''}`}>
                              <AvatarImage src={like.profile.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white text-xl">
                                {like.profile.nickname?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {!isUnlocked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock className="h-8 w-8 text-foreground/70" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className={`font-semibold text-lg truncate ${!isUnlocked ? 'blur-sm' : ''}`}>
                                {like.profile.nickname}
                              </h3>
                              {like.profile.age && (
                                <Badge variant="secondary" className={!isUnlocked ? 'blur-sm' : ''}>
                                  {like.profile.age}
                                </Badge>
                              )}
                            </div>
                            
                            {!isUnlocked ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Lock className="h-4 w-4" />
                                <p className="text-sm">Clicca per visualizzare (8 crediti)</p>
                              </div>
                            ) : (
                              <>
                                {(like.profile.translatedBio || like.profile.bio) && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {like.profile.translatedBio || like.profile.bio}
                                  </p>
                                )}
                                
                                {like.profile.translatedInterests && like.profile.translatedInterests.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {like.profile.translatedInterests.slice(0, 3).map((interest, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {interest}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLikeBack(like.id, like.from_user_id, like.profile.nickname);
                                  }}
                                  disabled={likingUserId === like.from_user_id}
                                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                                >
                                  <Heart className="h-4 w-4 mr-2" />
                                  {likingUserId === like.from_user_id ? t("likes.liking") : t("likes.likeBack")}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Likes;
