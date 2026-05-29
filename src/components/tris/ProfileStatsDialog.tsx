import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Heart, Check, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { VictoryIcon, DefeatIcon } from "@/lib/gameIcons";
import { computeAdminStats, computeAdminChampionDays } from "@/lib/adminElo";
import { computeChampionBadges, dateStringToDayNumber, ChampionBadges } from "@/lib/championBadges";
import { ChampionBadgesRow } from "./ChampionBadgesRow";
import { renderRankBadge, getRankNicknameClass } from "./EloLeaderboard";
import { useSendLike } from "@/hooks/useSendLike";

interface ProfileLike {
  id: string;
  nickname: string;
  avatar_url: string | null;
  elo?: number;                 // ELO da mostrare (per admin: simulato, per utenti reali: game_elo)
  is_admin_profile: boolean;
}

interface ProfileStats {
  elo: number;
  totalWins: number;
  totalLosses: number;
  top1Trophies: number;
  tournamentsWon: number;
  badges: ChampionBadges;
}

interface Props {
  profile: ProfileLike | null;
  onClose: () => void;
  // Posizione nella TOP 5 (per il trofeo header). null = non mostrare posizione.
  // Su richiesta utente non viene MAI mostrata durante le partite.
  topIndex?: number | null;
  // Mostra anche la "posizione classifica" sotto al nome. False di default.
  showRank?: boolean;
  // 🚫 Nasconde V/S quando aperto dalla classifica (richiesta utente).
  // Durante le partite (TrisBoard/CheckersBoard) deve restare false.
  hideWinsLosses?: boolean;
  // ❤️ Mostra il pulsante "Metti mi piace" in basso. Usato durante le
  // partite per permettere all'utente di mettere like all'avversario senza
  // dover uscire dalla schermata di gioco.
  showLikeButton?: boolean;
}

// 🏆 Dialog stats profilo: usato sia in EloLeaderboard (con showRank=true) sia
// nelle partite TrisBoard/CheckersBoard (con showRank=false). Carica le stats
// in modo asincrono al click; per admin usa computeAdminStats(id, allAdmins);
// per utenti reali legge da tris_games.
export const ProfileStatsDialog = ({ profile, onClose, topIndex = null, showRank = true, hideWinsLosses = false, showLikeButton = false }: Props) => {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // ❤️ Stato del sistema "Metti mi piace": stesso flusso di ProfileGridCard.
  // - hasLiked: true se già messo (lo sappiamo dal fetch iniziale).
  // - isLiking: durante chiamata RPC.
  // - showConfirmCredits: visibile quando i like giornalieri sono esauriti
  //   e proponiamo di usare 2 crediti.
  // - showCreditsExhausted: visibile quando finiti anche i crediti.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showConfirmCredits, setShowConfirmCredits] = useState(false);
  const [showCreditsExhausted, setShowCreditsExhausted] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const { sendLike } = useSendLike(currentUserId);

  // 🐛 FIX LOOP RICARICA: prima la dep era [profile] (l'intero oggetto).
  // TrisBoard/CheckersBoard ricreano un NUOVO oggetto profile ad ogni render
  // (per includere l'elo calcolato), quindi la reference cambiava ogni volta
  // → useEffect ri-eseguiva → loop infinito di fetch.
  // Ora dep solo [profile?.id, profile?.is_admin_profile]: cambia SOLO quando
  // si seleziona un altro profilo (id diverso), non ad ogni render del parent.
  useEffect(() => {
    if (!profile) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const profileId = profile.id;
    const isAdmin = profile.is_admin_profile;
    const fallbackElo = profile.elo ?? (isAdmin ? 1200 : 1200);

    (async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          const { data: admins } = await supabase
            .from("profiles")
            .select("id")
            .eq("is_admin_profile", true);
          if (cancelled) return;

          const adminStats = computeAdminStats(profileId, admins ?? []);
          // 🏅 Titoli campione admin (serie consecutive da #1, simulate)
          const champDays = computeAdminChampionDays(profileId, (admins ?? []) as any);
          setStats({
            elo: fallbackElo ?? adminStats.elo,
            totalWins: adminStats.totalWins,
            totalLosses: adminStats.totalLosses,
            top1Trophies: adminStats.top1Trophies,
            tournamentsWon: adminStats.tournamentsWon,
            badges: computeChampionBadges(champDays),
          });
        } else {
          const { data: tris } = await supabase
            .from("tris_games")
            .select("*")
            .eq("user_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cancelled) return;

          // 🏅 Titoli campione utente reale: giorni in cui è stato #1
          //    (storico in daily_top1_trophies).
          const { data: champRows } = await supabase
            .from("daily_top1_trophies")
            .select("award_date")
            .eq("user_id", profileId);
          if (cancelled) return;
          const champDays = (champRows ?? []).map((r: any) => dateStringToDayNumber(r.award_date));

          const row = tris as any;
          setStats({
            elo: fallbackElo,
            totalWins: (row?.tris_wins ?? 0) + (row?.dama_wins ?? 0) + (row?.othello_wins ?? 0),
            totalLosses: (row?.tris_losses ?? 0) + (row?.dama_losses ?? 0) + (row?.othello_losses ?? 0),
            top1Trophies: row?.top_1_trophies ?? 0,
            tournamentsWon: row?.tournaments_won ?? 0,
            badges: computeChampionBadges(champDays),
          });
        }
      } catch (e) {
        console.error("ProfileStatsDialog stats load error:", e);
        if (!cancelled) {
          setStats({
            elo: fallbackElo,
            totalWins: 0,
            totalLosses: 0,
            top1Trophies: 0,
            tournamentsWon: 0,
            badges: { everChampion: false, weeks: 0, months: 0 },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo l'id (e il tipo admin/user) trigggera il refetch — non l'oggetto intero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.is_admin_profile]);

  // ❤️ Quando il dialog si apre con un nuovo profilo + showLikeButton attivo:
  // - Recupera l'utente loggato
  // - Verifica se ha già messo like a questo profilo (per disabilitare il bottone)
  // - Recupera il saldo crediti (per mostrare il banner crediti esauriti)
  useEffect(() => {
    if (!profile || !showLikeButton) {
      setHasLiked(false);
      setShowConfirmCredits(false);
      setShowCreditsExhausted(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(user.id);

      // Check se già messo like
      const { data: likeRow } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("to_user_id", profile.id)
        .maybeSingle();
      if (cancelled) return;
      setHasLiked(!!likeRow);

      // Saldo crediti
      const { data: credRow } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setUserBalance((credRow as any)?.balance ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, showLikeButton]);

  // ❤️ Manda il like usando la stessa RPC `send_like` di ProfileGridCard
  // (atomica: gestisce like giornalieri, match auto, crediti).
  const handleLike = async (useCredits: boolean = false) => {
    if (!profile || hasLiked || isLiking || !currentUserId) return;
    setIsLiking(true);
    setHasLiked(true); // optimistic
    try {
      const result = await sendLike(profile.id, useCredits);
      if (!result.success) {
        setHasLiked(false);
        if (result.likes_remaining <= 0 && !useCredits) {
          // Like giornalieri finiti → proponi uso 2 crediti
          setShowConfirmCredits(true);
        } else {
          // Anche i crediti sono finiti
          setShowCreditsExhausted(true);
        }
        return;
      }
      if (result.match_created) {
        toast({
          title: "💖 È un match!",
          description: `Tu e ${profile.nickname} vi siete piaciuti a vicenda!`,
        });
      } else if (!result.already_exists) {
        toast({
          title: "❤️ Mi piace inviato",
          description: `Hai messo mi piace a ${profile.nickname}`,
        });
      }
      // Aggiorna balance se ha usato i crediti
      if (result.credits_used) setUserBalance(result.new_balance);
    } catch (e: any) {
      setHasLiked(false);
      toast({
        title: "Errore",
        description: e?.message || "Impossibile inviare il mi piace",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleUseCreditsForLike = async () => {
    setShowConfirmCredits(false);
    if (userBalance < 2) {
      setShowCreditsExhausted(true);
      return;
    }
    await handleLike(true);
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return "";
    if (avatarPath.startsWith("http")) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 0:
        return <span className="text-3xl">🏆</span>;
      case 1:
        return <span className="text-3xl">🥈</span>;
      case 2:
        return <span className="text-3xl">🥉</span>;
      case 3:
        return <span className="text-3xl">🎖️</span>;
      case 4:
        return <span className="text-3xl">🏅</span>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={!!profile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {profile && (
          <>
            <div className="relative bg-gradient-to-br from-primary/40 via-purple-500/30 to-pink-500/40 p-6 pb-12">
              <DialogHeader>
                <DialogTitle className="sr-only">{profile.nickname}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {showRank && topIndex !== null && topIndex >= 0 && topIndex < 5 && (
                  <div>{getTrophyIcon(topIndex)}</div>
                )}
                <Avatar className="w-24 h-24 border-4 border-white/40 shadow-2xl">
                  <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
                  <AvatarFallback className="text-3xl bg-primary/20">
                    {profile.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-2xl font-bold drop-shadow-lg">
                    {showRank && topIndex !== null && topIndex >= 0 && topIndex < 5 ? (
                      <span className={getRankNicknameClass(topIndex)}>{profile.nickname}</span>
                    ) : (
                      <span className="text-white">{profile.nickname}</span>
                    )}
                  </h3>
                  {showRank && topIndex !== null && topIndex >= 0 && (
                    <div className="mt-2">{renderRankBadge(topIndex, "md")}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 -mt-6 bg-background relative rounded-t-3xl">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.3em] font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]">
                      ELO
                    </p>
                    <p className="text-4xl font-bold text-primary drop-shadow-[0_0_12px_rgba(244,114,182,0.5)]">
                      {stats.elo}
                    </p>
                  </div>

                  {/* 🏅 Titoli (solo icone + tooltip al hover): Campione,
                      Campione della Settimana xN, Campione del Mese xN, Tornei Vinti xN. */}
                  <div className="flex justify-center pt-1">
                    <ChampionBadgesRow
                      badges={stats.badges}
                      tournamentsWon={stats.tournamentsWon}
                      size="md"
                    />
                  </div>

                  {/* 🔒 PRIVACY: V/S NON mostrate nei profili degli altri.
                      Ogni utente vede le proprie nel pannello /sfida sotto
                      "Il tuo ELO". Per scelta dell'admin sito 2026. */}

                  {/* ❤️ Pulsante "Metti mi piace" (solo se showLikeButton=true).
                      Stesso identico sistema della bacheca profili:
                      1. Tenta like normale (scala dai like giornalieri)
                      2. Se finiti → propone uso 2 crediti
                      3. Se anche crediti finiti → banner "Crediti esauriti" */}
                  {showLikeButton && currentUserId && profile.id !== currentUserId && (
                    <div className="pt-2 border-t border-border/30">
                      {/* Banner: Crediti esauriti */}
                      {showCreditsExhausted ? (
                        <div className="rounded-lg p-3 bg-gradient-to-br from-red-500/15 to-rose-500/10 border border-red-500/40">
                          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                            Crediti esauriti
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Non hai più like giornalieri né crediti sufficienti. Acquista crediti per continuare.
                          </p>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              onClose();
                              window.location.href = "/credits";
                            }}
                          >
                            Acquista crediti
                          </Button>
                        </div>
                      ) : showConfirmCredits ? (
                        /* Banner: like giornalieri finiti, usa 2 crediti? */
                        <div className="rounded-lg p-3 bg-gradient-to-br from-amber-500/15 to-yellow-500/10 border border-amber-500/40">
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                            Like giornalieri esauriti
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Vuoi usare <strong>2 crediti</strong> per inviare il mi piace? (Saldo: {userBalance})
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowConfirmCredits(false)}
                            >
                              Annulla
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleUseCreditsForLike}
                              disabled={userBalance < 2}
                              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                            >
                              Usa 2 crediti
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Pulsante principale Metti mi piace */
                        <Button
                          onClick={() => handleLike(false)}
                          disabled={isLiking || hasLiked}
                          className={`w-full font-semibold shadow-md transition-all ${
                            hasLiked
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500 text-white"
                              : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                          }`}
                        >
                          {isLiking ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Invio...
                            </>
                          ) : hasLiked ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Mi piace inviato
                            </>
                          ) : (
                            <>
                              <Heart className="h-4 w-4 mr-2 fill-current" />
                              Metti mi piace
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
