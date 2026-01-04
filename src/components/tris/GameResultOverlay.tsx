import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Frown, Handshake, Star, TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameResultOverlayProps {
  result: 'win' | 'lose' | 'draw' | null;
  creditsEarned?: number;
  eloChange?: number;
  onClose: () => void;
  gameName?: string;
}

const Confetti = () => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.left}%`,
            top: -20,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 100,
            rotate: piece.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

const WinOverlay: React.FC<{ creditsEarned: number; eloChange: number; onClose: () => void }> = ({
  creditsEarned,
  eloChange,
  onClose,
}) => (
  <motion.div
    className="fixed inset-0 z-[100] flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/30 via-amber-500/20 to-orange-500/30 backdrop-blur-sm" />
    <Confetti />
    
    <motion.div
      className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-b from-yellow-400/90 to-amber-500/90 shadow-2xl border-4 border-yellow-300"
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
      >
        <Trophy className="w-24 h-24 text-yellow-900 drop-shadow-lg" />
      </motion.div>
      
      <motion.h1
        className="text-4xl font-black text-yellow-900 tracking-tight"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        🎉 HAI VINTO! 🎉
      </motion.h1>
      
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-300/50">
          <Coins className="w-5 h-5 text-yellow-800" />
          <span className="font-bold text-yellow-900">+{creditsEarned} crediti</span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/50">
          <TrendingUp className="w-5 h-5 text-green-800" />
          <span className="font-bold text-green-900">+{eloChange} ELO</span>
        </div>
      </motion.div>
      
      <motion.div
        className="flex gap-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ 
              duration: 0.5, 
              delay: i * 0.1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <Star className="w-8 h-8 text-yellow-900 fill-yellow-300" />
          </motion.div>
        ))}
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <Button
          onClick={onClose}
          className="px-8 py-3 text-lg font-bold bg-yellow-900 hover:bg-yellow-800 text-yellow-100"
        >
          Continua
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);

const LoseOverlay: React.FC<{ eloChange: number; onClose: () => void }> = ({
  eloChange,
  onClose,
}) => (
  <motion.div
    className="fixed inset-0 z-[100] flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-gray-800/50 via-slate-700/40 to-gray-900/50 backdrop-blur-sm" />
    
    <motion.div
      className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-b from-slate-600/90 to-slate-700/90 shadow-2xl border-2 border-slate-500"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
    >
      <motion.div
        animate={{ 
          y: [0, -5, 0],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Frown className="w-20 h-20 text-slate-300" />
      </motion.div>
      
      <motion.h1
        className="text-3xl font-bold text-slate-200"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        😔 Hai perso
      </motion.h1>
      
      <motion.div
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/30"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <TrendingDown className="w-5 h-5 text-red-300" />
        <span className="font-bold text-red-200">{eloChange} ELO</span>
      </motion.div>
      
      <motion.p
        className="text-slate-400 text-center max-w-xs"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Non arrenderti! La prossima volta andrà meglio.
      </motion.p>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Button
          onClick={onClose}
          variant="outline"
          className="px-8 py-3 text-lg font-bold border-slate-400 text-slate-200 hover:bg-slate-600"
        >
          Continua
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);

const DrawOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    className="fixed inset-0 z-[100] flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 via-indigo-500/20 to-purple-500/20 backdrop-blur-sm" />
    
    <motion.div
      className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-b from-indigo-500/90 to-purple-600/90 shadow-2xl border-2 border-indigo-400"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
    >
      <motion.div
        animate={{ 
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Handshake className="w-20 h-20 text-indigo-200" />
      </motion.div>
      
      <motion.h1
        className="text-3xl font-bold text-indigo-100"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        🤝 Pareggio!
      </motion.h1>
      
      <motion.p
        className="text-indigo-200 text-center max-w-xs"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Una partita combattuta! Nessun cambiamento ELO.
      </motion.p>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button
          onClick={onClose}
          className="px-8 py-3 text-lg font-bold bg-indigo-700 hover:bg-indigo-600 text-indigo-100"
        >
          Continua
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);

export const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  result,
  creditsEarned = 6,
  eloChange = 0,
  onClose,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (result) {
      setShow(true);
    }
  }, [result]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {show && result === 'win' && (
        <WinOverlay creditsEarned={creditsEarned} eloChange={eloChange} onClose={handleClose} />
      )}
      {show && result === 'lose' && (
        <LoseOverlay eloChange={eloChange} onClose={handleClose} />
      )}
      {show && result === 'draw' && (
        <DrawOverlay onClose={handleClose} />
      )}
    </AnimatePresence>
  );
};

export default GameResultOverlay;
