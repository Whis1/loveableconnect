import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantRow } from "@/hooks/useTournament";

interface TournamentOpponentSearchProps {
  participants: ParticipantRow[];
  // Quando l'animazione di reveal e' completata, comunica al parent che puo'
  // passare alla view bracket.
  onComplete: () => void;
}

// 🎰 Animazione di "ricerca giocatori": rivela i 7 admin uno alla volta con
// effetto slot-machine + fade. Stessa identita' visuale di OpponentSearch ma
// con 7 reveal sequenziali invece di 1.
export const TournamentOpponentSearch = ({
  participants,
  onComplete,
}: TournamentOpponentSearchProps) => {
  // Numero di partecipanti gia' "rivelati". Da 0 a 8 (8 = utente + 7 admin).
  const [revealedCount, setRevealedCount] = useState(0);
  const animationStarted = useRef(false);

  useEffect(() => {
    if (animationStarted.current) return;
    if (participants.length < 8) return; // aspetta che siano tutti caricati
    animationStarted.current = true;

    // Reveal 1 partecipante ogni 350ms.
    // L'utente viene rivelato per primo (slot dispari), poi i 7 admin.
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setRevealedCount(count);
      if (count >= 8) {
        clearInterval(timer);
        // Piccola pausa finale poi passa al bracket.
        setTimeout(onComplete, 800);
      }
    }, 350);

    return () => clearInterval(timer);
  }, [participants, onComplete]);

  // Ordina i partecipanti per slot per il reveal coerente.
  const sortedParticipants = [...participants].sort((a, b) => a.slot - b.slot);

  const getAvatarUrl = (p: ParticipantRow): string => {
    if (p.profile?.avatar_url) {
      return supabase.storage.from("profile-images").getPublicUrl(p.profile.avatar_url).data.publicUrl;
    }
    if (p.profile?.photos && p.profile.photos.length > 0) {
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

        {/* Griglia 4x2 di slot con reveal progressivo */}
        <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
          {sortedParticipants.map((p, idx) => {
            const isRevealed = idx < revealedCount;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-500 ${
                  isRevealed
                    ? p.is_user
                      ? "border-cyan-400 bg-cyan-500/15 scale-105 shadow-lg shadow-cyan-500/40"
                      : "border-amber-500/40 bg-amber-500/10"
                    : "border-white/10 bg-muted/20 opacity-30"
                }`}
              >
                {p.is_user && isRevealed && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-[10px] font-black text-white shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    TU
                  </div>
                )}
                <Avatar
                  className={`w-16 h-16 border-2 ${
                    p.is_user
                      ? "border-cyan-300"
                      : isRevealed
                      ? "border-amber-400"
                      : "border-white/10"
                  } transition-all`}
                >
                  <AvatarImage src={isRevealed ? getAvatarUrl(p) : ""} />
                  <AvatarFallback className="bg-muted text-xs">
                    {isRevealed ? p.profile?.nickname?.[0] ?? "?" : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className={`text-xs font-semibold truncate w-full ${isRevealed ? "" : "blur-sm"}`}>
                    {isRevealed ? p.profile?.nickname ?? p.profile?.full_name ?? "Sfidante" : "???"}
                  </p>
                  <p
                    className={`text-[10px] font-medium ${
                      isRevealed ? "text-amber-300" : "text-muted-foreground"
                    }`}
                  >
                    {isRevealed ? `ELO ${p.elo_snapshot}` : "··"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          {revealedCount}/8 sfidanti selezionati
        </div>
      </div>
    </Card>
  );
};
