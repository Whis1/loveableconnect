import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gem, Scroll, Scissors, Hourglass, CircleCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 🎮 Spareggio Carta-Forbici-Sasso. PRIMO A 3 VITTORIE passa il turno.
// Quando l'utente sceglie, l'admin "ci pensa" 4-6 secondi (suspense realistico),
// con badge di stato accanto a ciascun profilo: "Sta decidendo" (clessidra) /
// "Ha scelto" (spunta verde). Icone lucide a tema, niente emoji base.

type Choice = "sasso" | "carta" | "forbici";
type Phase = "userTurn" | "botThinking" | "reveal";

const CHOICES: Choice[] = ["sasso", "carta", "forbici"];
const BEATS: Record<Choice, Choice> = { sasso: "forbici", carta: "sasso", forbici: "carta" };
const ICONS: Record<Choice, typeof Gem> = { sasso: Gem, carta: Scroll, forbici: Scissors };
const LABELS: Record<Choice, string> = { sasso: "Sasso", carta: "Carta", forbici: "Forbici" };

const WIN_TARGET = 3; // primo a 3 vittorie passa

interface RockPaperScissorsProps {
  userName: string;
  userAvatarUrl: string;
  opponentName: string;
  opponentAvatarUrl: string;
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
  const [phase, setPhase] = useState<Phase>("userTurn");
  const [roundResult, setRoundResult] = useState<"win" | "lose" | "tie" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (choice: Choice) => {
    if (phase !== "userTurn") return;
    setUserChoice(choice);
    setPhase("botThinking");

    // 🤖 L'admin "ci pensa" 4-6 secondi prima di scegliere
    const thinkMs = 4000 + Math.floor(Math.random() * 2001);
    const t1 = setTimeout(() => {
      const bot = CHOICES[Math.floor(Math.random() * 3)];
      let result: "win" | "lose" | "tie";
      if (choice === bot) result = "tie";
      else if (BEATS[choice] === bot) result = "win";
      else result = "lose";

      setBotChoice(bot);
      setRoundResult(result);
      setPhase("reveal");

      const newUser = userScore + (result === "win" ? 1 : 0);
      const newBot = botScore + (result === "lose" ? 1 : 0);
      if (result === "win") setUserScore(newUser);
      if (result === "lose") setBotScore(newBot);

      // Dopo il reveal: prossimo round o fine spareggio
      const t2 = setTimeout(() => {
        if (newUser >= WIN_TARGET) {
          onResult(true);
          return;
        }
        if (newBot >= WIN_TARGET) {
          onResult(false);
          return;
        }
        setUserChoice(null);
        setBotChoice(null);
        setRoundResult(null);
        setPhase("userTurn");
      }, 1900);
      timers.current.push(t2);
    }, thinkMs);
    timers.current.push(t1);
  };

  // Badge di stato accanto a ciascun profilo
  const StatusBadge = ({ state }: { state: "deciding" | "chosen" | "idle" }) => {
    if (state === "idle") return <div className="h-5" />;
    if (state === "deciding") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
          <Hourglass className="w-3 h-3 animate-pulse" />
          Sta decidendo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
        <CircleCheck className="w-3 h-3" />
        Ha scelto
      </span>
    );
  };

  const userState: "deciding" | "chosen" | "idle" =
    userChoice ? "chosen" : phase === "userTurn" ? "deciding" : "idle";
  const botState: "deciding" | "chosen" | "idle" =
    phase === "botThinking" ? "deciding" : phase === "reveal" ? "chosen" : "idle";

  // Carta scelta: nascosta (?) finche' non si arriva al reveal → suspense
  const ChoiceCard = ({
    choice,
    side,
    revealed,
  }: {
    choice: Choice | null;
    side: "user" | "bot";
    revealed: boolean;
  }) => {
    const showIcon = revealed && choice;
    const Icon = showIcon ? ICONS[choice] : null;
    return (
      <div
        className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
          side === "user" ? "border-cyan-400/50 bg-cyan-500/10" : "border-rose-400/50 bg-rose-500/10"
        }`}
      >
        <AnimatePresence mode="wait">
          {showIcon && Icon ? (
            <motion.div
              key="icon"
              initial={{ scale: 0.4, rotate: side === "user" ? -20 : 20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 220 }}
              className="flex flex-col items-center gap-1"
            >
              <Icon className={`w-10 h-10 ${side === "user" ? "text-cyan-200" : "text-rose-200"}`} />
              <span className="text-[10px] font-bold text-white/70">{LABELS[choice!]}</span>
            </motion.div>
          ) : (
            <motion.span
              key="q"
              className="text-3xl font-black text-white/25"
              animate={{ opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              ?
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Card className="mb-6 p-6 bg-gradient-to-br from-purple-950/55 via-fuchsia-900/35 to-indigo-950/55 border-pink-500/40 shadow-[0_8px_40px_-12px_rgba(244,114,182,0.45)] relative overflow-hidden">
      <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-pink-500/15 via-fuchsia-500/10 to-indigo-500/15 blur-3xl pointer-events-none" />

      <div className="relative">
        <h3 className="text-center text-xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent mb-1">
          Spareggio · Carta Forbici Sasso
        </h3>
        <p className="text-center text-xs text-muted-foreground mb-6">
          Chi arriva per primo a <strong className="text-pink-300">3 vittorie</strong> passa il turno
        </p>

        {/* Arena: profilo + stato + scelta, con scoreboard al centro */}
        <div className="flex items-start justify-center gap-4 sm:gap-8 mb-5">
          {/* Utente */}
          <div className="flex flex-col items-center gap-2 w-28">
            <Avatar className="w-12 h-12 border-2 border-cyan-400/60">
              <AvatarImage src={userAvatarUrl} />
              <AvatarFallback className="bg-cyan-500/20 text-xs">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-cyan-200 truncate max-w-full">{userName}</span>
            <StatusBadge state={userState} />
            <ChoiceCard choice={userChoice} side="user" revealed={phase === "reveal"} />
          </div>

          {/* Scoreboard */}
          <div className="flex flex-col items-center justify-center pt-3">
            <div className="text-4xl font-black text-white tabular-nums leading-none">
              {userScore}<span className="text-white/30 mx-1">·</span>{botScore}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/40 mt-1 font-bold">
              fino a {WIN_TARGET}
            </span>
            <span className="text-lg font-black text-white/30 mt-3">VS</span>
          </div>

          {/* Avversario (admin) */}
          <div className="flex flex-col items-center gap-2 w-28">
            <Avatar className="w-12 h-12 border-2 border-rose-400/60">
              <AvatarImage src={opponentAvatarUrl} />
              <AvatarFallback className="bg-rose-500/20 text-xs">
                {opponentName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-rose-200 truncate max-w-full">{opponentName}</span>
            <StatusBadge state={botState} />
            <ChoiceCard choice={botChoice} side="bot" revealed={phase === "reveal"} />
          </div>
        </div>

        {/* Esito round */}
        <div className="h-7 text-center mb-3">
          <AnimatePresence mode="wait">
            {roundResult && (
              <motion.p
                key={`${roundResult}-${userScore}-${botScore}`}
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
                {roundResult === "win"
                  ? "Round tuo!"
                  : roundResult === "lose"
                  ? "Round dell'avversario"
                  : "Round pari, si rigioca"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Pulsanti scelta */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {CHOICES.map((c) => {
            const Icon = ICONS[c];
            const disabled = phase !== "userTurn";
            return (
              <button
                key={c}
                onClick={() => play(c)}
                disabled={disabled}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                  !disabled
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

        {/* Sotto-testo guida */}
        <p className="text-center text-[11px] text-muted-foreground mt-4 h-4">
          {phase === "userTurn" && "Scegli la tua mossa"}
          {phase === "botThinking" && `${opponentName} sta scegliendo…`}
        </p>
      </div>
    </Card>
  );
};
