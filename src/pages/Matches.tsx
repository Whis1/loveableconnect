import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileThemeRing } from "@/components/ProfileThemeRing";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Trash2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import OnlineIndicator from "@/components/OnlineIndicator";
import { PageLoader } from "@/components/PageLoader";
import matchHeartIcon from "@/assets/match-heart.png";
import { withFallback } from "@/lib/async";
import { getStoredUserId } from "@/lib/storedSession";
import { useMatchNotification } from "@/contexts/MatchNotificationContext";

interface MatchWithProfile {
  id: string;
  created_at: string;
  last_message_at: string;
  otherUser: {
    id: string;
    full_name: string;
    nickname: string;
    is_admin_profile: boolean;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    translatedBio?: string | null;
    profile_theme?: string | null;
  };
}

const toPublicAvatarUrl = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  // Thumbnail QUADRATO (cover) per il cerchio avatar: leggero e ritagliato
  // correttamente (mostra il centro/volto). IMPORTANTE: per "cover" servono sia
  // width SIA height, altrimenti Supabase restituisce una fettina deformata
  // (es. 96x1280) sulle foto verticali e "non si vede niente".
  const { data } = supabase.storage.from("profile-images").getPublicUrl(path, {
    transform: { width: 200, height: 200, resize: "cover", quality: 70 },
  });
  return data.publicUrl || null;
};

// Fallback: se l'utente non ha un avatar_url ma ha foto nella galleria,
// usiamo la prima foto come avatar nei cerchi della lista match.
const resolveAvatarOrFirstPhoto = (
  avatar_url: string | null,
  photos: string[] | null | undefined
): string | null => {
  const direct = toPublicAvatarUrl(avatar_url);
  if (direct) return direct;
  if (photos && photos.length > 0) return toPublicAvatarUrl(photos[0]);
  return null;
};

const Matches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { translateText } = useTextTranslation();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  // Specchio dei match per accedervi dentro timer/listener senza ri-crearli.
  const matchesRef = useRef<MatchWithProfile[]>([]);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  // 🔔 Entrando nei match si "visualizza": ferma il lampeggio nella home.
  const { markSeen: markMatchesSeen } = useMatchNotification();
  useEffect(() => { markMatchesSeen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [onlineStatuses, setOnlineStatuses] = useState<Map<string, { isOnline: boolean; showStatus: boolean }>>(new Map());
  const { unreadCounts, getUnreadForMatch } = useUnreadMessages(currentUserId);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const loadingSafety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 12000);

    const setupRealtimeAndFetch = async () => {
      // Leggiamo l'id utente in modo SINCRONO dal localStorage invece di
      // chiamare supabase.auth.getSession(): su Supabase v2 quella chiamata
      // si pianta per minuti e la pagina restava in "Caricamento" senza
      // mostrare nessun match.
      const userId = getStoredUserId();
      if (!userId) {
        navigate("/auth");
        return;
      }
      // Simuliamo l'oggetto session per il resto del codice esistente.
      const session = { user: { id: userId } } as { user: { id: string } };

      if (cancelled) return;
      setCurrentUserId(session.user.id);

      const [matchesResult, hiddenResult] = await Promise.all([
        supabase
          .from("matches")
          .select("id, created_at, user1_id, user2_id")
          .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`),
        withFallback(
          supabase
            .from("hidden_matches")
            .select("match_id")
            .eq("user_id", session.user.id)
            .in("hidden_from", ["matches", "both"]),
          { data: [], error: null },
          3500
        ),
      ]);

      const { data: matchesData, error } = matchesResult;
      const { data: hiddenMatches } = hiddenResult;
      
      const hiddenMatchIds = new Set(hiddenMatches?.map(h => h.match_id) || []);
      
      // Filter out hidden matches
      const visibleMatches = (matchesData || []).filter(match => !hiddenMatchIds.has(match.id));

      if (error) {
        console.error("Error fetching matches:", error);
        toast({
          title: t("matches.error"),
          description: t("matches.errorLoadingMatches"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const otherUserIds = visibleMatches.map((match) =>
        match.user1_id === session.user.id ? match.user2_id : match.user1_id
      );
      const matchIds = visibleMatches.map((match) => match.id);

      const [profilesResult, messagesResult] = await Promise.all([
        otherUserIds.length > 0
          ? withFallback(
              supabase
                .from("profiles")
                .select("id, full_name, nickname, is_admin_profile, avatar_url, photos, bio, city, show_online_status, last_active, manual_online_status, profile_theme")
                .in("id", otherUserIds),
              { data: [], error: null },
              7000
            )
          : Promise.resolve({ data: [], error: null }),
        matchIds.length > 0
          ? withFallback(
              supabase
                .from("messages")
                .select("match_id, created_at")
                .in("match_id", matchIds)
                .order("created_at", { ascending: false })
                .limit(500),
              { data: [], error: null },
              7000
            )
          : Promise.resolve({ data: [], error: null }),
      ]);

      const profileMap = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
      const lastMessageMap = new Map<string, string>();
      (messagesResult.data || []).forEach((message) => {
        if (!lastMessageMap.has(message.match_id)) {
          lastMessageMap.set(message.match_id, message.created_at);
        }
      });

      const matchesWithProfiles = await Promise.all(
        visibleMatches.map(async (match) => {
          const otherUserId = match.user1_id === session.user.id ? match.user2_id : match.user1_id;
          const profile = profileMap.get(otherUserId);
          const translatedBio = profile?.bio
            ? await withFallback(translateText(profile.bio), profile.bio, 700)
            : null;

          return {
            id: match.id,
            created_at: match.created_at,
            last_message_at: lastMessageMap.get(match.id) || match.created_at,
            otherUser: profile ? {
              ...profile,
              avatar_url: resolveAvatarOrFirstPhoto(
                profile.avatar_url,
                (profile as { photos?: string[] | null }).photos ?? null
              ),
              translatedBio,
            } : {
              id: otherUserId,
              full_name: t("matches.unknownUser"),
              nickname: t("matches.unknownUser"),
              is_admin_profile: false,
              avatar_url: null,
              bio: null,
              city: null,
              translatedBio: null,
            },
          };
        })
      );

      // Sort by last message timestamp (most recent first)
      matchesWithProfiles.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      if (cancelled) return;
      setMatches(matchesWithProfiles);

      const statusMap = new Map<string, { isOnline: boolean; showStatus: boolean }>();
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      (profilesResult.data || []).forEach(profile => {
        let isOnline = false;
        const showStatus = profile.show_online_status ?? true;

        if (profile.manual_online_status !== null) {
          isOnline = profile.manual_online_status;
        } else if (profile.is_admin_profile) {
          isOnline = true;
        } else if (profile.last_active) {
          isOnline = new Date(profile.last_active) > twoMinutesAgo;
        }

        statusMap.set(profile.id, { isOnline, showStatus });
      });
      setOnlineStatuses(statusMap);

      setLoading(false);

      // Set up realtime subscription for new matches and messages
      channel = supabase
        .channel('matches-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
          },
          async (payload) => {
            const newMatch = payload.new as any;
            
            // Only process if this match involves the current user
            if (newMatch.user1_id !== session.user.id && newMatch.user2_id !== session.user.id) {
              return;
            }

            const otherUserId = newMatch.user1_id === session.user.id 
              ? newMatch.user2_id 
              : newMatch.user1_id;

            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, nickname, is_admin_profile, avatar_url, photos, bio, city, profile_theme")
              .eq("id", otherUserId)
              .single();

            const translatedBio = profile?.bio ? await translateText(profile.bio) : null;

            const matchWithProfile = {
              id: newMatch.id,
              created_at: newMatch.created_at,
              last_message_at: newMatch.created_at,
              otherUser: profile ? {
                ...profile,
                avatar_url: toPublicAvatarUrl(profile.avatar_url),
                translatedBio,
              } : {
                id: otherUserId,
                full_name: t("matches.unknownUser"),
                nickname: t("matches.unknownUser"),
                is_admin_profile: false,
                avatar_url: null,
                bio: null,
                city: null,
                translatedBio: null,
              },
            };

            setMatches(prev => [matchWithProfile, ...prev]);
            const displayName = matchWithProfile.otherUser.nickname;
            toast({
              title: t("matches.newMatch"),
              description: `${t("matches.newMatchWith")} ${displayName}!`,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${session.user.id}`,
          },
          async (payload) => {
            const newMessage = payload.new as any;
            
            // Update last_message_at for the match and move it to top
            setMatches(prev => {
              const matchIndex = prev.findIndex(m => m.id === newMessage.match_id);
              if (matchIndex === -1) return prev;
              
              const updatedMatch = {
                ...prev[matchIndex],
                last_message_at: newMessage.created_at,
              };
              
              // Remove from current position and add to top
              const newMatches = [...prev];
              newMatches.splice(matchIndex, 1);
              return [updatedMatch, ...newMatches];
            });

            // Show toast notification
            const match = matchesWithProfiles.find(m => m.id === newMessage.match_id);
            if (!match) return;

            const displayName = match.otherUser.nickname;
            
            toast({
              title: `Nuovo messaggio da ${displayName}`,
              description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
            });
          }
        )
        .subscribe();
    };

    setupRealtimeAndFetch()
      .catch((error) => {
        console.error("Error loading matches:", error);
        if (!cancelled) {
          toast({
            title: t("matches.error"),
            description: t("matches.errorLoadingMatches"),
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(loadingSafety);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate, toast, t]);

  // 🔝 "Casella postale": riallinea i match per ULTIMO messaggio. Oltre al
  // realtime (che sposta in cima all'arrivo di un messaggio), ricontrolliamo
  // anche periodicamente e quando si torna sulla scheda, leggendo solo i
  // timestamp (leggero) e riordinando. Cosi' chi scrive sale in cima in modo
  // affidabile anche se il realtime perde un evento.
  useEffect(() => {
    if (!currentUserId) return;

    const resortByLastMessage = async () => {
      const current = matchesRef.current;
      if (current.length === 0) return;
      const ids = current.map((m) => m.id);
      const { data, error } = await supabase
        .from("messages")
        .select("match_id, created_at")
        .in("match_id", ids)
        .order("created_at", { ascending: false })
        .limit(800);
      if (error || !data) return;

      const lastMap = new Map<string, string>();
      data.forEach((m: any) => {
        if (!lastMap.has(m.match_id)) lastMap.set(m.match_id, m.created_at);
      });

      setMatches((prev) => {
        const updated = prev.map((m) => ({
          ...m,
          last_message_at: lastMap.get(m.id) || m.last_message_at,
        }));
        // Riordina solo se l'ordine e' effettivamente cambiato (evita render inutili).
        const sorted = [...updated].sort(
          (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );
        const sameOrder = sorted.every((m, i) => m.id === prev[i]?.id);
        return sameOrder ? prev : sorted;
      });
    };

    const onFocus = () => resortByLastMessage();
    const onVisible = () => {
      if (document.visibilityState === "visible") resortByLastMessage();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") resortByLastMessage();
    }, 20000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [currentUserId]);

  const handleHideMatch = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUserId) return;

    // Delete the match completely so the profile reappears in Explore
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (error) {
      console.error("Error deleting match:", error);
      toast({
        title: t("matches.error"),
        description: t("matches.errorHidingMatch"),
        variant: "destructive",
      });
      return;
    }

    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-2 md:p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-3 md:mb-4">
          <Button variant="ghost" onClick={() => navigate("/")} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
            {t("matches.back")}
          </Button>
        </div>

        <Card className="bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/app-background.png')" }}>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-xl md:text-2xl">{t("matches.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6">
            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                {/* Nessuna card e nessun cuoricino: il cuore grande
                    dell'immagine di sfondo basta come elemento visivo. Il
                    testo e' bianco grosso con drop-shadow scuro per essere
                    sempre leggibile. */}
                <p
                  className="mb-6 text-lg md:text-2xl font-extrabold text-white max-w-md"
                  style={{
                    textShadow:
                      "0 2px 4px rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.55)",
                  }}
                >
                  {t("matches.noMatches")}
                </p>
                <Button
                  onClick={() => navigate("/explore")}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold px-6 shadow-[0_8px_20px_rgba(190,24,93,0.5)]"
                >
                  {t("matches.exploreProfiles")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {matches.map((match) => (
                  <Card key={match.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-background to-accent/5">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <ProfileThemeRing themeId={match.otherUser.profile_theme}>
                            <Avatar className="h-14 w-14 md:h-20 md:w-20 border-4 border-primary/20 shadow-md">
                              <AvatarImage src={match.otherUser.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl">
                                {match.otherUser.nickname.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </ProfileThemeRing>
                          <div className="absolute -bottom-1 -right-1">
                            <OnlineIndicator userId={match.otherUser.id} size="md" preloadedStatus={onlineStatuses.get(match.otherUser.id)} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-base md:text-xl truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {match.otherUser.nickname}
                            </h3>
                            <img src={matchHeartIcon} alt="Match" className="h-5 w-5 md:h-6 md:w-6 object-contain shrink-0" />
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-start gap-1 max-w-full rounded-full border border-pink-400/40 bg-pink-500/5 px-2 py-0.5 text-[11px] md:text-xs font-medium text-pink-600 dark:text-pink-300">
                              <Heart className="h-3 w-3 mt-px fill-current shrink-0" />
                              <span>{t("matches.matchSince")} {new Date(match.created_at).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="relative">
                            <Button
                              onClick={() => navigate(`/chat/${match.id}`)}
                              size="sm"
                              className="shrink-0"
                            >
                              <MessageCircle className="h-4 w-4 md:mr-2" />
                              <span className="hidden md:inline">{t("matches.chat")}</span>
                            </Button>
                            {getUnreadForMatch(match.id) > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 flex items-center justify-center p-0 text-[10px] md:text-xs"
                              >
                                {getUnreadForMatch(match.id)}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleHideMatch(match.id, e)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                            aria-label="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default Matches;
