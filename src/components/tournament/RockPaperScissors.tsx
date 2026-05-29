import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gem, Scroll, Scissors, Hourglass, CircleCheck, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 🎮 Spareggio Carta-Forbici-Sasso, PRIMO A 3 VITTORIE.
//
// Realismo: i due giocatori scelgono in modo INDIPENDENTE e simultaneo.
// - All'inizio di ogni round entrambi sono "Sta decidendo".
// - L'admin blocca la sua scelta per conto suo dopo 2-6s (NON dipende dalla
//   mossa dell'utente) → diventa "Ha scelto" (mossa nascosta).
// - L'utente sceglie quando vuole entro 30 secondi → "Ha scelto".
// - Quando ENTRAMBI hanno scelto, le mosse si rivelano e appare l'esito.
// - Se l'utente non sceglie entro 30s → perde lo spareggio.

type Choice = "sasso" | "carta" | "forbici";
type Phase = "playing" | "reveal";

const CHOICES: Choice[] = ["sasso", "carta", "forbici"];
const BEATS: Record<Choice, Choice> = { sasso: "forbici", carta: "sasso", forbici: "carta" };
const ICONS: Record<Choice, typeof Gem> = { sasso: Gem, carta: Scroll, forbici: Scissors };
const LABELS: Record<Choice, string> = { sasso: "Sasso", carta: "Carta", forbici: "Forbici" };

const WIN_TARGET = 3;
const ROUND_SECONDS = 30;

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
  const [round, setRound] = useState(0);
  const [userChoice, setUserChoice] = useState<Choice | null>(null);
  const [botChoice, setBotChoice] = useState<Choice | null>(null);
  const [botCommitted, setBotCommitted] = useState(false);
  const [phase, setPhase] = useState<Phase>("playing");
  const [roundResult, setRoundResult] = useState<"win" | "lose" | "tie" | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  // ===== Setup di ogni round =====
  useEffect(() => {
    setUserChoice(null);
    setBotChoice(null);
    setBotCommitted(false);
    setRoundResult(null);
    setPhase("playing");
    setTimeLeft(ROUND_SECONDS);

    // 🤖 L'admin blocca la sua mossa INDIPENDENTEMENTE dopo 2-6 secondi.
    botCommitRef.current = setTimeout(() => {
      setBotChoice(CHOICES[Math.floor(Math.random() * 3)]);
      setBotCommitted(true);
    }, 2000 + Math.random() * 4000);

    // ⏱️ Countdown 30s: se l'utente non sceglie in tempo, perde lo spareggio.
    let secs = ROUND_SECONDS;
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setTimeLeft(secs);
      if (secs <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        onResultRef.current(false); // tempo scaduto → eliminato
      }
    }, 1000);

    return () => {
      if (botCommitRef.current) clearTimeout(botCommitRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [round]);

  // ===== Quando ENTRAMBI hanno scelto → reveal + esito =====
  useEffect(() => {
    if (phase !== "playing" || !userChoice || !botChoice) return;

    let result: "win" | "lose" | "tie";
    if (userChoice === botChoice) result = "tie";
    else if (BEATS[userChoice] === botChoice) result = "win";
    else result = "lose";

    setRoundResult(result);
    setPhase("reveal");

    const newUser = userScore + (result === "win" ? 1 : 0);
    const newBot = botScore + (result === "lose" ? 1 : 0);
    if (result === "win") setUserScore(newUser);
    if (result === "lose") setBotScore(newBot);

    const t = setTimeout(() => {
      if (newUser >= WIN_TARGET) return onResultRef.current(true);
      if (newBot >= WIN_TARGET) return onResultRef.current(false);
      setRound((r) => r + 1); // prossimo round (l'effect di setup resetta tutto)
    }, 1900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userChoice, botChoice, phase]);

  const play = (c: Choice) => {
    if (phase !== "playing" || userChoice) return;
    setUserChoice(c);
    // L'utente ha scelto in tempo → ferma il countdown.
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const StatusBadge = ({ chosen }: { chosen: boolean }) =>
    chosen ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
        <CircleCheck className="w-3 h-3" />
        Ha scelto
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
        <Hourglass className="w-3 h-3 animate-pulse" />
        Sta decidendo
      </span>
    );

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
        className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center transition-colors ${
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

  const showTimer = phase === "playing" && !userChoice;
  const timerDanger = timeLeft <= 10;

  return (
    <Card className="mb-6 p-6 bg-gradient-to-br from-purple-950/55 via-fuchsia-900/35 to-indigo-950/55 border-pink-500/40 shadow-[0_8px_40px_-12px_rgba(244,114,182,0.45)] relative overflow-hidden">
      <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-pink-500/15 via-fuchsia-500/10 to-indigo-500/15 blur-3xl pointer-events-none" />

      <div className="relative">
        <h3 className="text-center text-xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent mb-1">
          Spareggio · Carta Forbici Sasso
        </h3>
        <p className="text-center text-xs text-muted-foreground mb-5">
          Chi arriva per primo a <strong className="text-pink-300">3 vittorie</strong> passa il turno
        </p>

        {/* Countdown round */}
        <div className="h-8 flex items-center justify-center mb-3">
          {showTimer && (
            <motion.div
              key={timeLeft}
              initial={{ scale: 1.15, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-sm ${
                timerDanger
                  ? "bg-rose-600/40 text-rose-100 border border-rose-300/50"
                  : "bg-white/10 text-white/80 border border-white/20"
              }`}
            >
              <Timer className="w-4 h-4" />
              {timeLeft}s
            </motion.div>
          )}
        </div>

        {/* Arena: profilo + stato + carta */}
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
            <StatusBadge chosen={!!userChoice} />
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
            <StatusBadge chosen={botCommitted} />
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
            const disabled = phase !== "playing" || !!userChoice;
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
          {phase === "playing" && !userChoice && "Scegli la tua mossa prima dello scadere del tempo"}
          {phase === "playing" && userChoice && !botChoice && `In attesa della mossa di ${opponentName}…`}
        </p>
      </div>
    </Card>
  );
};
