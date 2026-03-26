import React, { useState, useCallback, useEffect } from "react";
import RadioMain from "./components/RadioMain";
import { OrientationLock } from "./components/OrientationLock";
import { useImageColor } from "./hooks/useImageColor";
import { SplashScreen } from "./components/SplashScreen";
import { AnimatePresence } from "framer-motion";

const LOGO_URL = import.meta.env.VITE_RADIO_LOGO_URL || "https://i1.sndcdn.com/avatars-000304126092-ysdpwc-t240x240.jpg";

export default function App() {
  console.log("App.tsx: Rendering...");
  const [isReady, setIsReady] = useState(false);
  const brandColor = useImageColor(LOGO_URL);
  console.log("App.tsx: Brand color:", brandColor);

  useEffect(() => {
    console.log("App.tsx: Setting fallback timer for splash screen...");
    const fallbackTimer = setTimeout(() => {
      if (!isReady) {
        console.warn("App.tsx: Fallback timer triggered, forcing isReady to true...");
        setIsReady(true);
      }
    }, 10000); // 10 seconds fallback
    return () => clearTimeout(fallbackTimer);
  }, [isReady]);

  const handleSplashComplete = useCallback(() => {
    console.log("App.tsx: Splash complete, setting isReady to true...");
    setIsReady(true);
  }, []);

  const hexToRgb = (hex: string) => {
    if (!hex || hex.length < 7) return "212, 175, 55"; // Fallback para #D4AF37
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  return (
    <div 
      className="min-h-screen bg-zinc-950"
      style={{ 
        '--brand-color': brandColor,
        '--brand-color-rgb': hexToRgb(brandColor)
      } as any}
    >
      <AnimatePresence mode="wait">
        {!isReady ? (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        ) : (
          <div key="main" className="min-h-screen">
            <OrientationLock />
            <RadioMain brandColor={brandColor} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
