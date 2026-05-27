import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, X, Loader2 } from "lucide-react";
import othelloIcon from "@/assets/othello-icon.png";
import damaIcon from "@/assets/dama-icon.png";

interface TournamentSelectionBannerProps {
  onSelect: (game: "othello" | "dama") => void;
  onClose: () => void;
  isCreating?: boolean;
}

// 🏆 Banner di selezione torneo: 2 card grandi per Othello e Dama.
// Il "biglietto" (1 partita giornaliera o 2 crediti) e' già stato pagato in
// handleStartGame (prima di entrare nel gameState='selecting'), quindi qui
// l'utente sta solo scegliendo quale torneo iniziare.
export const TournamentSelectionBanner = ({
  onSelect,
  onClose,
  isCreating = false,
}: TournamentSelectionBannerProps) => {
  return (
    <Card className="mb-6 p-8 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-amber-500/30 backdrop-blur-sm relative overflow-hidden">
      {/* Glow di sfondo */}
      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-orange-500/20 blur-3xl pointer-events-none" />

      <div className="relative flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)] flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.6)]" />
            Scegli il Torneo
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2">
            8 giocatori, bracket a eliminazione diretta. Vinci la finale per ottenere{" "}
            <span className="text-amber-400 font-bold">12 crediti</span> e{" "}
            <span className="text-amber-400 font-bold">+60 ELO</span>. Gli admin sono
            difficili da battere: solo i migliori arrivano in fondo. 🏆
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isCreating}
          className="hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={() => onSelect("othello")}
          disabled={isCreating}
          className="h-auto p-6 flex flex-col items-center gap-4 bg-gradient-to-br from-emerald-500/20 via-green-600/15 to-emerald-700/20 hover:from-emerald-500/30 hover:via-green-600/25 hover:to-emerald-700/30 border-2 border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <div className="w-20 h-20 flex items-center justify-center">
            {isCreating ? (
              <Loader2 className="w-16 h-16 animate-spin text-emerald-300" />
            ) : (
              <img src={othelloIcon} alt="Othello" className="w-full h-full object-contain drop-shadow-lg" />
            )}
          </div>
          <div className="text-center z-10">
            <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]">
              Torneo Othello
            </span>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              8 sfidanti · eliminazione diretta
            </p>
          </div>
        </Button>

        <Button
          onClick={() => onSelect("dama")}
          disabled={isCreating}
          className="h-auto p-6 flex flex-col items-center gap-4 bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-purple-700/20 hover:from-purple-500/30 hover:via-purple-600/25 hover:to-purple-700/30 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <div className="w-24 h-24 flex items-center justify-center">
            {isCreating ? (
              <Loader2 className="w-16 h-16 animate-spin text-red-300" />
            ) : (
              <img src={damaIcon} alt="Dama" className="w-full h-full object-contain drop-shadow-lg scale-110" />
            )}
          </div>
          <div className="text-center z-10">
            <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(239,68,68,0.5)]">
              Torneo Dama
            </span>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              8 sfidanti · eliminazione diretta
            </p>
          </div>
        </Button>
      </div>

      <div className="relative mt-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
        <p className="text-xs text-amber-200/90">
          📜 <strong>Premi:</strong> 🥇 12 crediti + 60 ELO · 🥈 4 crediti · 🥉 2 crediti ·{" "}
          ogni sconfitta -20 ELO
        </p>
      </div>
    </Card>
  );
};
