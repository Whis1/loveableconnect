import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Heart, Sparkles, X } from "lucide-react";

interface TournamentResultBannerProps {
  open: boolean;
  /** Posizione finale dell'utente (1=vincitore, 2=finale persa, 3-4=semi persa, 5-8=quarti persa) */
  finalPosition: number | null;
  /** Crediti effettivamente accreditati (da claim_tournament_rewards) */
  creditsAwarded: number;
  /** Delta ELO applicato (positivo o negativo) */
  eloDelta: number;
  gameType: "othello" | "dama";
  /** Se true → mostra il banner come "vai a casa". Se false → l'utente puo'
   *  scegliere di restare come spettatore (solo per eliminazioni intermedie) */
  allowSpectate?: boolean;
  onClose: () => void;
  onContinueAsSpectator?: () => void;
}

// 🏆 Banner risultato torneo: layout differente per vincitore vs eliminato.
//   - 1° posto: festa celebrativa con confetti vibe
//   - 2° posto: "Quasi!" con premio consolazione
//   - 3°/4° posto: "Hai raggiunto la semifinale" + 2 crediti
//   - 5°-8°: "Eliminato ai quarti" senza premio
export const TournamentResultBanner = ({
  open,
  finalPosition,
  creditsAwarded,
  eloDelta,
  gameType,
  allowSpectate = false,
  onClose,
  onContinueAsSpectator,
}: TournamentResultBannerProps) => {
  const isWinner = finalPosition === 1;
  const isFinalist = finalPosition === 2;
  const isSemifinalist = finalPosition === 3 || finalPosition === 4;
  const isQuarterfinalist = finalPosition !== null && finalPosition >= 5;

  const title = isWinner
    ? "🏆 Hai vinto il torneo!"
    : isFinalist
    ? "🥈 Finalista!"
    : isSemifinalist
    ? "🥉 Semifinalista"
    : isQuarterfinalist
    ? "💔 Eliminato ai quarti"
    : "Torneo concluso";

  const subtitle = isWinner
    ? `Sei campione del torneo ${gameType === "othello" ? "Othello" : "Dama"}!`
    : isFinalist
    ? "Sei arrivato fino alla finale. Un'altra volta!"
    : isSemifinalist
    ? "Hai raggiunto la semifinale, ottimo risultato."
    : "Riprova: gli admin sono forti, ma migliorerai.";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            {isWinner ? (
              <div className="relative">
                <Trophy className="w-24 h-24 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
                <Sparkles className="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
                <Sparkles className="w-6 h-6 text-amber-300 absolute -bottom-1 -left-2 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            ) : isFinalist || isSemifinalist ? (
              <Trophy className={`w-20 h-20 ${isFinalist ? "text-slate-300" : "text-orange-400"} drop-shadow-[0_0_15px_rgba(148,163,184,0.5)]`} />
            ) : (
              <div className="relative">
                <Heart className="w-20 h-20 text-rose-500/30" />
                <X className="w-10 h-10 text-rose-500 absolute bottom-0 right-0" />
              </div>
            )}
          </div>

          <AlertDialogTitle className={`text-center text-2xl font-black ${
            isWinner
              ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent"
              : ""
          }`}>
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-center space-y-4 pt-3" asChild>
            <div>
              <p className="text-base text-foreground">{subtitle}</p>

              {/* Riepilogo premi */}
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 mt-3">
                {creditsAwarded > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Crediti ottenuti</span>
                    <span className="font-black text-emerald-400">+{creditsAwarded}</span>
                  </div>
                )}
                {eloDelta !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Variazione ELO</span>
                    <span className={`font-black ${eloDelta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {eloDelta > 0 ? "+" : ""}{eloDelta}
                    </span>
                  </div>
                )}
                {creditsAwarded === 0 && eloDelta === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Nessuna ricompensa per questo piazzamento.
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:gap-2 mt-2">
          {allowSpectate && onContinueAsSpectator && (
            <Button
              variant="outline"
              onClick={onContinueAsSpectator}
              className="w-full m-0"
            >
              👁️ Continua come spettatore
            </Button>
          )}
          <Button
            onClick={onClose}
            className={`w-full m-0 ${
              isWinner
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold"
                : ""
            }`}
          >
            {isWinner ? "🎉 Continua" : "Torna alla Sfida"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
