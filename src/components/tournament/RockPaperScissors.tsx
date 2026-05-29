import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gem, Scroll, Scissors } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 🎮 Spareggio Carta-Forbici-Sasso, al meglio dei 3 (primo a 2 vittorie).
// Usato quando una partita di torneo finisce in pareggio (Othello 32-32).
// Icone lucide a tema (Gem=Sasso, Scroll=Carta, Scissors=Forbici), niente emoji base.

type Choice = "sasso" | "carta" | "forbici";

const CHOICES: Choice[] = ["sasso", "carta", "forbici"];
// key BATTE value
const BEATS: Record<Choice, Choice> = {
  sasso: "forbici",
  carta: "sasso",
  forbici: "carta",
};
const ICONS: Record<Choice, typeof Gem> = {
  sasso: Gem,
  carta: Scroll,
  forbici: Scissors,
};
const LABELS: Record<Choice, string> = {
  sasso: "Sasso",
  carta: "Carta",
  forbici: "Forbici",
};

interface RockPaperScissorsProps {
  userName: string;
  userAvatarUrl: string;
  opponentName: string;
  opponentAvatarUrl: string;
  /** Chiamata a fine spareggio (primo a 2): userWon=true se passa l'utente */
  onResult: (userWon: boolean) => void;
}

export const RockPaperScissors = ({
  userName,
  userAvatarUrl,
  opponentName,
  opponentAvatarUrl,
  onResult,
}: RockPaperScissorsProps) => {
  const [userScore, setUserScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [userChoice, setUserChoice] = useState<Choice | null>(null);
  const [botChoice, setBotChoice] = useState<Choice | null>(null);
  const [phase, setPhase] = useState<"choosing" | "revealing">("choosing");
  const [roundResult, setRoundResult] = useState<"win" | "lose" | "tie" | null>(null);

  const play = (choice: Choice) => {
    if (phase !== "choosing") return;
    const bot = CHOICES[Math.floor(Math.random() * 3)];

    let result: "win" | "lose" | "tie";
    if (choice === bot) result = "tie";
    else if (BEATS[choice] === bot) result = "win";
    else result = "lose";

    setUserChoice(choice);
    setBotChoice(bot);
    setRoundResult(result);
    setPhase("revealing");

    const newUser = userScore + (result === "win" ? 1 : 0);
    const newBot = botScore + (result === "lose" ? 1 : 0);

    // Pausa per far vedere il reveal, poi avanza/termina
    setTimeout(() => {
      if (result === "win") setUserScore(newUser);
      if (result === "lose") setBotScore(newBot);

      // Primo a 2 vittorie passa
      if (newUser >= 2) {
        onResult(true);
        return;
      }
      if (newBot >= 2) {
        onResult(false);
        return;
      }

      // Prossimo round
      setUserChoice(null);
      setBotChoice(null);
      setRoundResult(null);
      setPhase("choosing");
    }, 1700);
  };

  const ChoiceReveal = ({ choice, side }: { choice: Choice | null; side: "user" | "bot" }) => {
    if (!choice) {
      return (
        <div className="w-20 h-20 rounded-2xl border-2 border-white/15 bg-white/5 flex items-center justify-center">
          <span className="text-2xl font-black text-white/30">?</span>
        </div>
      );
    }
    const Icon = ICONS[choice];
    return (
      <motion.div
        initial={{ scale: 0.4, rotate: side === "user" ? -25 : 25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 12, stiffness: 220 }}
        className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 ${
          side === "user"
            ? "border-cyan-400/60 bg-cyan-500/15"
            : "border-rose-400/60 bg-rose-500/15"
        }`}
      >
        <Icon className={`w-9 h-9 ${side === "user" ? "text-cyan-200" : "text-rose-200"}`} />
        <span className="text-[9px] font-bold text-white/70">{LABELS[choice]}</span>
      </motion.div>
    );
  };

  return (
    <Card className="mb-6 p-6 bg-gradient-to-br from-purple-950/50 via-fuchsia-900/30 to-indigo-950/50 border-pink-500/40 shadow-[0_8px_40px_-12px_rgba(244,114,182,0.4)] relative overflow-hidden">
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-pink-500/15 via-fuchsia-500/10 to-indigo-500/15 blur-3xl pointer-events-none" />

      <div className="relative">
        <h3 className="text-center text-xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent mb-1">
          Spareggio · Carta Forbici Sasso
        </h3>
        <p className="text-center text-xs text-muted-foreground mb-5">
          Al meglio dei 3 — chi arriva a 2 vittorie passa il turno
        </p>

        {/* Scoreboard: utente vs avversario */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex flex-col items-center gap-1">
            <Avatar className="w-12 h-12 border-2 border-cyan-400/60">
              <AvatarImage src={userAvatarUrl} />
              <AvatarFallback className="bg-cyan-500/20 text-xs">{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-cyan-200 max-w-[80px] truncate">{userName}</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-3xl font-black text-white tabular-nums">
              {userScore} <span className="text-white/40">·</span> {botScore}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Avatar className="w-12 h-12 border-2 border-rose-400/60">
              <AvatarImage src={opponentAvatarUrl} />
              <AvatarFallback className="bg-rose-500/20 text-xs">{opponentName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-rose-200 max-w-[80px] truncate">{opponentName}</span>
          </div>
        </div>

        {/* Arena reveal */}
        <div className="flex items-center justify-center gap-5 mb-2">
          <ChoiceReveal choice={userChoice} side="user" />
          <span className="text-lg font-black text-white/40">VS</span>
          <ChoiceReveal choice={botChoice} side="bot" />
        </div>

        {/* Esito round */}
        <div className="h-7 text-center mb-3">
          <AnimatePresence mode="wait">
            {roundResult && (
              <motion.p
                key={roundResult + userScore + botScore}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm font-black ${
                  roundResult === "win"
                    ? "text-emerald-300"
                    : roundResult === "lose"
                    ? "text-rose-300"
                    : "text-white/60"
                }`}
              >
                {roundResult === "win" ? "Round tuo!" : roundResult === "lose" ? "Round avversario" : "Round pari, si rigioca"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Pulsanti scelta */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {CHOICES.map((c) => {
            const Icon = ICONS[c];
            return (
              <button
                key={c}
                onClick={() => play(c)}
                disabled={phase !== "choosing"}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                  phase === "choosing"
                    ? "border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 hover:border-pink-400/60 hover:scale-105 cursor-pointer"
                    : "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                }`}
              >
                <Icon className="w-7 h-7 text-pink-200" />
                <span className="text-xs font-bold text-white/80">{LABELS[c]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
