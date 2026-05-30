import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, X, Loader2 } from "lucide-react";
import othelloIcon from "@/assets/othello-icon.png";
import damaIcon from "@/assets/dama-icon.png";
import { MedalIcon, EliminatedIcon } from "@/lib/championIcons";

interface TournamentSelectionBannerProps {
  onSelect: (game: "othello" | "dama") => void;
  onClose: () => void;
  isCreating?: boolean;
}

// 🏆 Banner di selezione torneo: 2 card grandi per Othello e Dama.
// Tema rosa/fuchsia/indigo coerente col TrisGameBanner.
export const TournamentSelectionBanner = ({
  onSelect,
  onClose,
  isCreating = false,
}: TournamentSelectionBannerProps) => {
  return (
    <Card
      className="
        mb-6 p-7 relative overflow-hidden
        bg-gradient-to-br from-purple-950/40 via-fuchsia-900/25 to-indigo-950/40
        border border-pink-500/30
        shadow-[0_8px_40px_-12px_rgba(244,114,182,0.35)]
        before:absolute before:inset-0 before:pointer-events-none
        before:bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_60%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_55%)]
      "
    >
      <div className="relative flex justify-between items-start mb-3">
        <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
          <Trophy className="w-7 h-7 text-pink-300" />
          Scegli il Torneo
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isCreating}
          className="hover:bg-white/5 text-foreground/70 hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* 📜 Come funziona + premi */}
      <div className="relative mb-5 rounded-xl bg-black/20 border border-pink-500/20 p-4 space-y-2.5">
        <p className="text-sm text-foreground/90">
          8 sfidanti, eliminazione diretta. Batti l'avversario a ogni round per
          avanzare: <strong className="text-pink-300">quarti → semifinale → finale</strong>.
        </p>
        <p className="text-xs text-foreground/80">
          Nel torneo di <strong className="text-emerald-300">Othello</strong> può capitare che
          una partita si concluda in parità. In questa eventualità, nei quarti e nelle
          semifinali il passaggio del turno si decide con una sfida a{" "}
          <strong className="text-pink-300">Carta-Forbici-Sasso</strong>; in finale, invece,
          la partita viene rigiocata finché uno dei due finalisti non vince.
        </p>
        <p className="text-xs text-foreground/80">
          Nel torneo di <strong className="text-rose-300">Dama</strong>, se per diverse mosse
          consecutive nessuno dei due cattura una pedina, la partita è dichiarata patta.
          Anche in questo caso, nei quarti e nelle semifinali si passa il turno con una sfida
          a <strong className="text-pink-300">Carta-Forbici-Sasso</strong>, mentre in finale la
          partita viene rigiocata finché uno dei due finalisti non vince.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            <MedalIcon tier="gold" place={1} className="w-6 h-6 shrink-0" />
            <span className="text-xs text-foreground/90">
              <strong className="text-amber-300">Vinci il torneo:</strong> +12 crediti, +60 ELO
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-400/10 border border-slate-300/30 px-3 py-2">
            <MedalIcon tier="silver" place={2} className="w-6 h-6 shrink-0" />
            <span className="text-xs text-foreground/90">
              <strong className="text-slate-200">Perdi in finale:</strong> +4 crediti, −20 ELO
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-400/30 px-3 py-2">
            <MedalIcon tier="bronze" place={3} className="w-6 h-6 shrink-0" />
            <span className="text-xs text-foreground/90">
              <strong className="text-orange-300">Perdi in semifinale:</strong> +2 crediti, −20 ELO
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-400/30 px-3 py-2">
            <EliminatedIcon className="w-6 h-6 shrink-0" />
            <span className="text-xs text-foreground/90">
              <strong className="text-rose-300">Eliminato ai quarti:</strong> nessun premio, −20 ELO
            </span>
          </div>
        </div>
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
          <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]">
            Torneo Othello
          </span>
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
          <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(239,68,68,0.5)]">
            Torneo Dama
          </span>
        </Button>
      </div>
    </Card>
  );
};
