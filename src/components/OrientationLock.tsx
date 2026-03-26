import { Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { getDeviceType } from "../lib/device";

export const OrientationLock = () => {
  console.log("OrientationLock.tsx: Rendering...");
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const deviceType = getDeviceType();
      
      // Only show the lock if it's NOT a desktop AND in landscape
      const landscape = window.innerWidth > window.innerHeight && window.innerHeight < 600;
      setIsLandscape(deviceType !== 'desktop' && landscape);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  return (
    <AnimatePresence>
      {isLandscape && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center"
        >
          <motion.div
            animate={{ rotate: [0, -90, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 text-brand"
          >
            <Smartphone size={64} />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2 font-display">Gire seu dispositivo</h2>
          <p className="text-zinc-400 max-w-xs">
            Este aplicativo foi desenvolvido para ser usado apenas na vertical (retrato). Por favor, gire seu celular.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
