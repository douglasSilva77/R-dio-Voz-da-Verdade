import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  console.log("SplashScreen.tsx: Rendering...");

  useEffect(() => {
    // Automatically complete after 4.5 seconds
    const timer = setTimeout(() => {
      console.log("SplashScreen.tsx: Timer complete, calling onComplete...");
      onComplete();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2 
          }}
          className="relative"
        >
          {/* Pulsing Rings */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: i * 0.4,
                ease: "easeOut" 
              }}
              className="absolute inset-0 border-2 border-brand/30 rounded-full"
            />
          ))}
          
          <div className="w-[150px] h-[150px] bg-brand/10 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand/20 relative z-10 border border-brand/20 overflow-hidden">
            <img 
              src={import.meta.env.VITE_RADIO_LOGO_URL || "https://i1.sndcdn.com/avatars-000304126092-ysdpwc-t240x240.jpg"} 
              alt="Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
        {/* Text Animation */}
        <div className="flex flex-col items-center gap-2">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-3xl font-display font-bold text-white tracking-tight"
          >
            {import.meta.env.VITE_RADIO_NAME || "Shekinah Fm"}
          </motion.h1>
          
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-brand font-medium tracking-[0.2em] text-xs uppercase"
          >
            Conectando você com Deus
          </motion.p>
        </div>

        {/* Loading Bar */}
        <div className="h-16 flex items-center justify-center">
          <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="w-full h-full bg-brand shadow-[0_0_10px_rgba(var(--brand-color-rgb),0.5)]"
            />
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-12 text-[10px] uppercase tracking-widest text-zinc-500 font-bold"
      >
        Carregando Transmissão HD
      </motion.div>
    </motion.div>
  );
}
