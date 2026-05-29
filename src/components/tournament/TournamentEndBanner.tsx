import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Coins, TrendingUp, TrendingDown, Heart, X, Sparkles } from "lucide-react";

// 🏆 Banner di fine torneo con tema oro/rosa coerente col sito.
// Variants per posizione finale:
//   1° → vittoria celebrativa con trofeo oro + confetti
//   2° → argento elegante
//   3°/4° → bronzo
//   5°-8° → eliminazione (rosa/rosso)
// Auto-close dopo AUTO_CLOSE_MS, oppure click "X" per chiudere prima.

interface TournamentEndBannerProps {
  open: boolean;
  /** Posizione finale (1=vincitore, 2=finalista, 3-4=semifinalista, 5-8=quarti) */
  finalPosition: number | null;
  creditsAwarded: number;
  eloDelta: number;
  gameType: "othello" | "dama";
  onClose: () => void;
}

const AUTO_CLOSE_MS = 5000;

// Confetti rosa/oro/viola coerente col tema del sito
const Confetti: React.FC = () => {
  const colors = ["#FFD700", "#F472B6", "#A855F7", "#FBBF24", "#EC4899", "#8B5CF6"];
  const pieces = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 2 + Math.random() * 2.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 10,
    shape: Math.random() > 0.6 ? "50%" : "2px",
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: -30,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape,
          }}
          initial={{ y: -30, rotate: 0, opacity: 1 }}
          animate={{
            y: typeof window !== "undefined" ? window.innerHeight + 100 : 1000,
            rotate: p.rotation + 720,
            opacity: [1, 1, 0.7, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

export const TournamentEndBanner: React.FC<TournamentEndBannerProps> = ({
  open,
  finalPosition,
  creditsAwarded,
  eloDelta,
  gameType,
  onClose,
}) => {
  const [progress, setProgress] = useState(0);

  // 🛡️ Ref per onClose: cosi' useEffect dipende solo da `open`. Senza questo,
  //    onClose cambiava reference ad ogni render del parent → useEffect runa
  //    di nuovo → timer reset da capo → countdown non scatta mai.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / AUTO_CLOSE_MS) * 100);
      setProgress(pct);
      if (elapsed >= AUTO_CLOSE_MS) {
        clearInterval(interval);
        onCloseRef.current();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const isWinner = finalPosition === 1;
  const isSecond = finalPosition === 2;
  const isThirdFourth = finalPosition === 3 || finalPosition === 4;
  const isEliminated = finalPosition !== null && finalPosition >= 5;

  const config = isWinner
    ? {
        title: "Hai vinto il Torneo!",
        subtitle: `Tournament Champion · ${gameType === "othello" ? "Othello" : "Dama"} · 1° posto`,
        gradientFrom: "from-amber-400",
        gradientVia: "via-yellow-300",
        gradientTo: "to-amber-500",
        boxGradient: "from-amber-500/95 via-yellow-400/95 to-orange-500/95",
        borderColor: "border-yellow-300",
        glowColor: "shadow-amber-500/60",
        Icon: Trophy,
        iconColor: "text-yellow-100 drop-shadow-[0_0_15px_rgba(252,211,77,0.8)]",
        progressBarBg: "bg-yellow-200",
        showConfetti: true,
      }
    : isSecond
    ? {
        title: "Hai perso la Finale",
        subtitle: "2° posto · sei arrivato fino in fondo",
        gradientFrom: "from-slate-300",
        gradientVia: "via-slate-200",
        gradientTo: "to-slate-400",
        boxGradient: "from-slate-500/95 via-slate-400/95 to-slate-600/95",
        borderColor: "border-slate-300",
        glowColor: "shadow-slate-400/50",
        Icon: Medal,
        iconColor: "text-slate-100 drop-shadow-[0_0_12px_rgba(203,213,225,0.6)]",
        progressBarBg: "bg-slate-200",
        showConfetti: false,
      }
    : isThirdFourth
    ? {
        title: "Hai perso in Semifinale",
        subtitle: "Top 4 del torneo",
        gradientFrom: "from-orange-300",
        gradientVia: "via-amber-400",
        gradientTo: "to-orange-500",
        boxGradient: "from-orange-600/95 via-amber-600/95 to-orange-700/95",
        borderColor: "border-orange-300",
        glowColor: "shadow-orange-500/50",
        Icon: Medal,
        iconColor: "text-orange-100 drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]",
        progressBarBg: "bg-orange-200",
        showConfetti: false,
      }
    : isEliminated
    ? {
        title: "Eliminato ai Quarti",
        subtitle: "",
        gradientFrom: "from-rose-300",
        gradientVia: "via-pink-400",
        gradientTo: "to-rose-500",
        boxGradient: "from-rose-600/95 via-pink-600/95 to-fuchsia-700/95",
        borderColor: "border-rose-300",
        glowColor: "shadow-rose-500/50",
        Icon: Heart,
        iconColor: "text-rose-100 drop-shadow-[0_0_12px_rgba(244,114,182,0.6)]",
        progressBarBg: "bg-rose-200",
        showConfetti: false,
      }
    : {
        title: "Torneo concluso",
        subtitle: "",
        gradientFrom: "from-indigo-300",
        gradientVia: "via-purple-400",
        gradientTo: "to-indigo-500",
        boxGradient: "from-indigo-600/95 via-purple-600/95 to-indigo-700/95",
        borderColor: "border-indigo-300",
        glowColor: "shadow-indigo-500/50",
        Icon: Sparkles,
        iconColor: "text-indigo-100",
        progressBarBg: "bg-indigo-200",
        showConfetti: false,
      };

  const Icon = config.Icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop blur */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-pink-950/50 to-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Confetti solo per vincitore */}
          {config.showConfetti && <Confetti />}

          {/* Card centrale */}
          <motion.div
            className={`relative z-10 w-full max-w-md rounded-3xl border-4 ${config.borderColor} bg-gradient-to-br ${config.boxGradient} shadow-2xl ${config.glowColor} overflow-hidden`}
            initial={{ scale: 0.7, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 18, stiffness: 220, delay: 0.1 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress bar in alto */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
              <motion.div
                className={`h-full ${config.progressBarBg}`}
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>

            <div className="px-8 py-8 flex flex-col items-center text-center gap-5">
              {/* Icon container con glow + sparkles per vincitore */}
              <motion.div
                className="relative"
                animate={
                  isWinner
                    ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                    : { y: [0, -4, 0] }
                }
                transition={{
                  duration: isWinner ? 0.8 : 2,
                  repeat: Infinity,
                  repeatDelay: isWinner ? 0.5 : 0,
                }}
              >
                {isWinner && (
                  <>
                    <Sparkles className="absolute -top-3 -right-3 w-7 h-7 text-yellow-200 drop-shadow-glow animate-pulse" />
                    <Sparkles
                      className="absolute -bottom-2 -left-3 w-5 h-5 text-yellow-300 animate-pulse"
                      style={{ animationDelay: "400ms" }}
                    />
                  </>
                )}
                <Icon className={`w-24 h-24 ${config.iconColor}`} />
              </motion.div>

              {/* Title */}
              <motion.h2
                className={`text-3xl font-black tracking-tight bg-gradient-to-r ${config.gradientFrom} ${config.gradientVia} ${config.gradientTo} bg-clip-text text-transparent drop-shadow-lg`}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {config.title}
              </motion.h2>

              {/* Subtitle */}
              {config.subtitle && (
                <motion.p
                  className="text-sm text-white/90 max-w-xs"
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {config.subtitle}
                </motion.p>
              )}

              {/* Bilancio premio: cosa si vince/perde, esplicito */}
              <motion.div
                className="w-full flex flex-col items-center gap-2 mt-1"
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-[11px] uppercase tracking-wider font-bold text-white/70">
                  Il tuo bilancio
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* Crediti: sempre mostrato (vinti se >0, altrimenti "0 crediti") */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 border border-white/40 backdrop-blur">
                    <Coins className="w-4 h-4 text-yellow-100" />
                    <span className="font-black text-white text-sm">
                      {creditsAwarded > 0 ? `+${creditsAwarded} crediti` : "0 crediti"}
                    </span>
                  </div>

                  {/* ELO: positivo (vittoria torneo) o negativo (qualsiasi sconfitta) */}
                  {eloDelta > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/40 border border-emerald-200/50 backdrop-blur">
                      <TrendingUp className="w-4 h-4 text-emerald-100" />
                      <span className="font-black text-white text-sm">+{eloDelta} ELO</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-700/50 border border-rose-200/50 backdrop-blur">
                      <TrendingDown className="w-4 h-4 text-rose-100" />
                      <span className="font-black text-white text-sm">{eloDelta} ELO</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
