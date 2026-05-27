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

// 🎰 Animazione di ricerca PARALLELA dei 7 sfidanti, stile slot machine del 1v1.
// - Fetch di TUTTI i profili admin dal DB → pool ricco di volti che scorrono.
// - Tutti i 7 slot girano CONTEMPORANEAMENTE, ognuno con la sua durata random (9-15s).
// - Ogni 150ms tutti gli slot non-fermi cambiano avatar (NITIDO, non blurrato).
// - Quando il timer di uno slot scade, si ferma sul profilo realmente assegnato a
//   quello slot (con bordo dorato + transizione).
// - L'utente e' fisso fin dall'inizio (gia' loggato, lo si conosce).

const SEARCH_DURATION_MIN_MS = 9000;
const SEARCH_DURATION_MAX_MS = 15000;
const SCROLL_INTERVAL_MS = 150;

interface AdminProfile {
  id: string;
  nickname: string | null;
  full_name: string;
  avatar_url: string | null;
  photos: string[] | null;
}

export const TournamentOpponentSearch = ({
  participants,
  onComplete,
}: TournamentOpponentSearchProps) => {
  const sortedParticipants = useMemo(
    () => [...participants].sort((a, b) => a.slot - b.slot),
    [participants]
  );

  // Pool di TUTTI gli admin per lo scrolling. Fetched al mount, poi usato
  // ciclicamente come nel 1v1 (OpponentSearch).
  const [adminPool, setAdminPool] = useState<AdminProfile[]>([]);
  // Indice corrente di scrolling per ogni slot (-1 = fissato sul profilo vero).
  const [scrollIndices, setScrollIndices] = useState<Record<number, number>>({});
  // Slot gia' fissati sull'admin assegnato.
  const [settledSlots, setSettledSlots] = useState<Set<number>>(new Set());
  const animationStarted = useRef(false);

  // Fetch pool admin profiles all'inizio.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nickname, full_name, avatar_url, photos")
        .eq("is_admin_profile", true);
      if (!cancelled && data) {
        // Shuffle deterministico per avere ordini diversi a ogni mount
        const shuffled = [...data];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setAdminPool(shuffled as AdminProfile[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (animationStarted.current) return;
    if (sortedParticipants.length < 8) return;
    if (adminPool.length === 0) return; // aspetta il fetch
    animationStarted.current = true;

    const settleTimers: ReturnType<typeof setTimeout>[] = [];

    // Imposta l'utente come gia' fissato (lo conosciamo, lo vediamo subito).
    sortedParticipants.forEach((p) => {
      if (p.is_user) {
        setSettledSlots((prev) => {
          const next = new Set(prev);
          next.add(p.slot);
          return next;
        });
      }
    });

    // Genera durata random per ogni slot admin.
    sortedParticipants.forEach((p) => {
      if (p.is_user) return;
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

    // Scrolling globale ogni 150ms: incrementa l'indice di ogni slot non-fermo.
    // Ogni slot ha un OFFSET random iniziale cosi' non sono tutti sincroni.
    const initialOffsets: Record<number, number> = {};
    sortedParticipants.forEach((p) => {
      if (!p.is_user) {
        initialOffsets[p.slot] = Math.floor(Math.random() * adminPool.length);
      }
    });
    setScrollIndices(initialOffsets);

    const scrollTimer = setInterval(() => {
      setScrollIndices((prev) => {
        const next = { ...prev };
        sortedParticipants.forEach((p) => {
          if (p.is_user) return;
          // Incremento +1 ciclico → effetto "scroll" naturale come nel 1v1
          next[p.slot] = ((prev[p.slot] ?? 0) + 1) % adminPool.length;
        });
        return next;
      });
    }, SCROLL_INTERVAL_MS);

    return () => {
      settleTimers.forEach(clearTimeout);
      clearInterval(scrollTimer);
    };
  }, [sortedParticipants, adminPool]);

  // Quando TUTTI gli slot sono settled → pausa drammatica → onComplete.
  useEffect(() => {
    if (settledSlots.size === 8) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [settledSlots, onComplete]);

  // Costruisce URL avatar da uno dei due formati possibili (avatar_url o photos[0])
  const buildAvatarUrl = (
    avatar_url: string | null | undefined,
    photos: string[] | null | undefined
  ): string => {
    if (avatar_url) {
      return supabase.storage.from("profile-images").getPublicUrl(avatar_url).data.publicUrl;
    }
    if (photos && photos.length > 0) {
      return supabase.storage.from("profile-images").getPublicUrl(photos[0]).data.publicUrl;
    }
    return "";
  };

  const getDisplayInfo = (p: ParticipantRow) => {
    const isSettled = settledSlots.has(p.slot);
    if (isSettled || p.is_user) {
      // Mostra il profilo realmente assegnato a questo slot
      return {
        nickname: p.profile?.nickname ?? p.profile?.full_name ?? "Sfidante",
        avatarUrl: buildAvatarUrl(p.profile?.avatar_url, p.profile?.photos),
      };
    }
    // Slot ancora in "ricerca": mostra il profilo dal pool nell'indice corrente
    const idx = scrollIndices[p.slot] ?? 0;
    const cycling = adminPool[idx % adminPool.length];
    return {
      nickname: cycling?.nickname ?? cycling?.full_name ?? "Sfidante",
      avatarUrl: buildAvatarUrl(cycling?.avatar_url, cycling?.photos),
    };
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

        <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
          {sortedParticipants.map((p) => {
            const isSettled = settledSlots.has(p.slot);
            const { nickname, avatarUrl } = getDisplayInfo(p);

            return (
              <div
                key={p.id}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors duration-200 ${
                  isSettled
                    ? p.is_user
                      ? "border-cyan-400 bg-cyan-500/15 scale-105 shadow-lg shadow-cyan-500/40"
                      : "border-amber-500/70 bg-amber-500/15 shadow-lg shadow-amber-500/30"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                {p.is_user && isSettled && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-[10px] font-black text-white shadow-lg flex items-center gap-1 z-10">
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
                      : "border-amber-500/50 animate-pulse"
                  } transition-colors`}
                >
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-muted text-xs">
                    {nickname?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center min-h-[36px]">
                  <p className="text-xs font-semibold truncate w-full">{nickname}</p>
                  <p
                    className={`text-[10px] font-medium ${
                      isSettled ? "text-amber-300" : "text-amber-400/60"
                    }`}
                  >
                    {isSettled ? `ELO ${p.elo_snapshot}` : "🔍 ricerca…"}
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
