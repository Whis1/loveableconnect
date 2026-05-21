import { motion } from "framer-motion";
import matchHeart from "@/assets/match-heart.png";

export const PageLoader = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-fuchsia-950"
      role="status"
      aria-label="Caricamento"
    >
      <div className="relative h-12 w-64">
        {/* Cuore-logo che scorre da sinistra a destra sopra la barra */}
        <motion.img
          src={matchHeart}
          alt=""
          className="absolute left-0 top-1 h-7 w-7 object-contain"
          draggable={false}
          animate={{
            x: [0, 224],
            opacity: [0, 1, 1, 0],
            scale: [0.85, 1.05, 1.05, 0.85],
          }}
          transition={{
            duration: 1.35,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.15, 0.85, 1],
          }}
        />

        {/* Barra di caricamento alla base del contenitore */}
        <div
          className="absolute bottom-1 left-1/2 h-1.5 w-56 -translate-x-1/2 overflow-hidden rounded-full bg-white/20"
          aria-hidden="true"
        >
          <motion.div
            className="h-full w-16 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-300 to-violet-300"
            animate={{ x: [-70, 225] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
};
