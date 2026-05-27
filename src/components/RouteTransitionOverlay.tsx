import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import loveableIcon from "@/assets/loveable-connect-icon.png";
import matchHeart from "@/assets/match-heart.png";

interface RouteTransitionOverlayProps {
  routeKey: string;
}

export const RouteTransitionOverlay = ({ routeKey }: RouteTransitionOverlayProps) => {
  const firstRender = useRef(true);
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setAnimationKey((value) => value + 1);
    setVisible(true);

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, prefersReducedMotion ? 180 : 820);

    return () => window.clearTimeout(timeout);
  }, [routeKey, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={animationKey}
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-0 bg-background/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: prefersReducedMotion ? 0.2 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          />

          <motion.div
            className="absolute inset-y-0 left-0 w-[165vw]"
            initial={{ x: "-118%" }}
            animate={{ x: "112%" }}
            transition={{
              duration: prefersReducedMotion ? 0.16 : 0.76,
              ease: [0.2, 0.9, 0.18, 1],
            }}
          >
            <div className="absolute inset-y-0 left-0 w-full -skew-x-12 bg-gradient-to-r from-transparent via-pink-500/95 via-[36%] to-fuchsia-500/95 shadow-[0_0_70px_rgba(236,72,153,0.42)]" />
            <div className="absolute inset-y-0 left-[8%] w-[70%] -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute top-1/2 left-[36%] h-24 w-[52vw] -translate-y-1/2 -skew-x-12 rounded-full bg-gradient-to-r from-transparent via-white/45 to-transparent blur-xl" />

            <motion.div
              className="absolute top-1/2 left-[39%] h-24 w-56 -translate-y-1/2 md:h-28 md:w-72"
              initial={{ scale: 0.9, rotate: -2 }}
              animate={{ scale: [0.9, 1.03, 1], rotate: [-2, 1, 0] }}
              transition={{ duration: prefersReducedMotion ? 0.16 : 0.58, ease: "easeOut" }}
            >
              <div className="absolute left-8 top-1/2 h-14 w-40 -translate-y-1/2 rounded-full bg-white/20 blur-md md:h-16 md:w-52" />
              <img
                src={loveableIcon}
                alt=""
                className="absolute left-0 top-1/2 h-20 w-20 -translate-y-1/2 object-contain drop-shadow-[0_12px_28px_rgba(88,28,135,0.45)] md:h-24 md:w-24"
                draggable={false}
              />
              <div className="absolute left-16 top-1/2 h-12 w-32 -translate-y-1/2 rounded-full border border-white/50 bg-white/18 shadow-[0_0_28px_rgba(255,255,255,0.24)] backdrop-blur-md md:left-20 md:h-14 md:w-40">
                <div className="absolute left-5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/85 shadow-[0_0_14px_rgba(255,255,255,0.7)]" />
                <div className="absolute left-12 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.6)] md:left-16" />
                <div className="absolute left-20 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/60 shadow-[0_0_14px_rgba(255,255,255,0.55)] md:left-28" />
              </div>
              <img
                src={matchHeart}
                alt=""
                className="absolute right-0 top-1/2 h-14 w-14 -translate-y-1/2 object-contain drop-shadow-[0_12px_24px_rgba(190,24,93,0.45)] md:h-16 md:w-16"
                draggable={false}
              />
            </motion.div>

            {[0, 1, 2, 3, 4].map((item) => (
              <motion.span
                key={item}
                className="absolute h-2.5 w-2.5 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.8)]"
                style={{
                  top: `${28 + item * 10}%`,
                  left: `${27 - item * 5}%`,
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.25, 0.8] }}
                transition={{
                  duration: prefersReducedMotion ? 0.16 : 0.55,
                  delay: item * 0.045,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
