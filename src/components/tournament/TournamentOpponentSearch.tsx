import { useEffect, useState, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantRow } from "@/hooks/useTournament";

interface TournamentOpponentSearchProps {
  participants: ParticipantRow[];
  onComplete: () => void;
}

// 🎰 Animazione di ricerca PARALLELA dei 7 sfidanti.
// Tutti gli slot admin girano in CONTEMPORANEA: ognuno mostra profili a rotazione
// (150ms tra un cambio e l'altro) per una durata random 9-15s.
// Quando il timer di ogni slot scade, si ferma sul profilo realmente assegnato a quel slot.
// L'utente e' fisso fin dall'inizio (e' gia' loggato, lo si conosce).
// Quando TUTTI gli slot admin si sono fermati, chiama onComplete.

const SEARCH_DURATION_MIN_MS = 9000;
const SEARCH_DURATION_MAX_MS = 15000;
const SCROLL_INTERVAL_MS = 150;

export const TournamentOpponentSearch = ({
  participants,
  onComplete,
}: TournamentOpponentSearchProps) => {
  // Sorted by slot, deterministico
  const sortedParticipants = useMemo(
    () => [...participants].sort((a, b) => a.slot - b.slot),
    [participants]
  );

  // Indice corrente di scrolling per ogni slot (per i 7 admin che ruotano).
  // Per lo slot utente, sempre -1 (significa "fermo, mostra il profilo vero").
  const [scrollIndices, setScrollIndices] = useState<Record<number, number>>({});
  // Quali slot si sono GIA' fermati sul profilo assegnato.
  const [settledSlots, setSettledSlots] = useState<Set<number>>(new Set());
  const animationStarted = useRef(false);

  // Pool di profili da mostrare nello scrolling: usiamo i 7 admin selezionati
  // + qualche profilo random per varieta'. Per semplicita' usiamo gli 8 partecipanti
  // stessi (l'utente compare ogni tanto ma e' un dettaglio innocuo nello scrolling).
  const scrollPool = useMemo(() => sortedParticipants, [sortedParticipants]);

  useEffect(() => {
    if (animationStarted.current) return;
    if (sortedParticipants.length < 8) return;
    animationStarted.current = true;

    // Per ogni slot admin (non utente), genera una durata random e schedula
    // il "settle" (fermata) a quel timestamp.
    const settleTimers: ReturnType<typeof setTimeout>[] = [];

    sortedParticipants.forEach((p) => {
      if (p.is_user) {
        // L'utente e' subito "settled" (mostra se stesso).
        setSettledSlots((prev) => {
          const next = new Set(prev);
          next.add(p.slot);
          return next;
        });
        return;
      }
      const duration =
        SEARCH_DURATION_MIN_MS +
        Math.floor(Math.random() * (SEARCH_DURATION_MAX_MS - SEARCH_DURATION_MIN_MS + 1));
      const t = setTimeout(() => {
        setSettledSlots((prev) => {
          const next = new Set(prev);
          next.add(p.slot);
          return next;
        });
      }, duration);
      settleTimers.push(t);
    });

    // Scrolling globale: ogni SCROLL_INTERVAL_MS aggiorna l'indice di tutti gli
    // slot che non si sono ancora fermati.
    const scrollTimer = setInterval(() => {
      setScrollIndices((prev) => {
        const next = { ...prev };
        sortedParticipants.forEach((p) => {
          if (p.is_user) return;
          // Random tra 0 e scrollPool.length-1 ogni tick → effetto slot machine
          next[p.slot] = Math.floor(Math.random() * scrollPool.length);
        });
        return next;
      });
    }, SCROLL_INTERVAL_MS);

    return () => {
      settleTimers.forEach(clearTimeout);
      clearInterval(scrollTimer);
    };
  }, [sortedParticipants, scrollPool]);

  // Quando TUTTI gli slot sono settled, fai una breve pausa drammatica e poi onComplete.
  useEffect(() => {
    if (settledSlots.size === 8) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [settledSlots, onComplete]);

  const getAvatarUrl = (p: ParticipantRow | undefined): string => {
    if (!p?.profile) return "";
    if (p.profile.avatar_url) {
      return supabase.storage.from("profile-images").getPublicUrl(p.profile.avatar_url).data.publicUrl;
    }
    if (p.profile.photos && p.profile.photos.length > 0) {
      return supabase.storage.from("profile-images").getPublicUrl(p.profile.photos[0]).data.publicUrl;
    }
    return "";
  };

  return (
    <Card className="p-8 text-center bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border-amber-500/30 relative overflow-hidden">
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-orange-500/20 blur-3xl pointer-events-none animate-pulse" />

      <div className="relative">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
          <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
            Composizione torneo in corso...
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Sto selezionando i 7 sfidanti che si batteranno contro di te.
        </p>

        {/* Griglia 4x2 di slot con ricerca PARALLELA */}
        <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
          {sortedParticipants.map((p) => {
            const isSettled = settledSlots.has(p.slot);

            // Profilo da mostrare: se non settled, mostra quello "in scroll";
            // se settled, mostra quello realmente assegnato a questo slot.
            const displayParticipant = isSettled
              ? p
              : scrollPool[scrollIndices[p.slot] ?? 0] ?? p;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${
                  isSettled
                    ? p.is_user
                      ? "border-cyan-400 bg-cyan-500/15 scale-105 shadow-lg shadow-cyan-500/40"
                      : "border-amber-500/60 bg-amber-500/15 shadow-lg shadow-amber-500/20"
                    : "border-amber-500/30 bg-amber-500/5 animate-pulse"
                }`}
              >
                {p.is_user && isSettled && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-[10px] font-black text-white shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    TU
                  </div>
                )}
                <Avatar
                  className={`w-16 h-16 border-2 ${
                    p.is_user
                      ? "border-cyan-300"
                      : isSettled
                      ? "border-amber-400"
                      : "border-amber-500/40"
                  } transition-all ${!isSettled ? "blur-[1px]" : ""}`}
                >
                  <AvatarImage src={getAvatarUrl(displayParticipant)} />
                  <AvatarFallback className="bg-muted text-xs">
                    {displayParticipant?.profile?.nickname?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center min-h-[36px]">
                  <p
                    className={`text-xs font-semibold truncate w-full ${
                      isSettled ? "" : "blur-[2px] opacity-60"
                    }`}
                  >
                    {displayParticipant?.profile?.nickname ??
                      displayParticipant?.profile?.full_name ??
                      "Sfidante"}
                  </p>
                  <p
                    className={`text-[10px] font-medium ${
                      isSettled ? "text-amber-300" : "text-amber-400/40"
                    }`}
                  >
                    {isSettled ? `ELO ${p.elo_snapshot}` : "··· ricerca ···"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          {settledSlots.size}/8 sfidanti selezionati
        </div>
      </div>
    </Card>
  );
};
