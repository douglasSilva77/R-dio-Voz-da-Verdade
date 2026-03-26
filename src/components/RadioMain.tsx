import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Radio, Music2, MessageCircle, Share2, Download, Users, Menu, X, Instagram, Facebook, Info, MessageSquare, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { Chat } from "./Chat";
import { getDeviceType } from "../lib/device";

interface Station {
  id: string;
  name: string;
  url: string;
  genre: string;
  logo: string;
}

const STATIONS: Station[] = [
  {
    id: "voxhd",
    name: import.meta.env.VITE_RADIO_NAME || "Shekinah Fm",
    url: "/api/stream",
    genre: import.meta.env.VITE_RADIO_GENRE || "Gospel",
    logo: import.meta.env.VITE_RADIO_LOGO_URL || "https://i1.sndcdn.com/avatars-000304126092-ysdpwc-t240x240.jpg"
  }
];

interface RadioMainProps {
  brandColor: string;
}

export default function RadioMain({ brandColor }: RadioMainProps) {
  console.log("RadioMain.tsx: Rendering with brandColor:", brandColor);
  const [currentStation, setCurrentStation] = useState<Station>(STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<string>("Buscando música...");
  const [listeners, setListeners] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWebTVModalOpen, setIsWebTVModalOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Handle back button to prevent closing the app
  useEffect(() => {
    // Push initial state to history
    window.history.pushState({ noBack: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      // If any modal is open, close it first
      if (isSidebarOpen || isInfoModalOpen || isChatOpen || isWebTVModalOpen) {
        setIsSidebarOpen(false);
        setIsInfoModalOpen(false);
        setIsChatOpen(false);
        setIsWebTVModalOpen(false);
        
        // Push state back to keep the user on the page
        window.history.pushState({ noBack: true }, "");
      } else {
        // If no modal is open, just push state back to prevent exit
        window.history.pushState({ noBack: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isSidebarOpen, isInfoModalOpen, isChatOpen, isWebTVModalOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.error("Retry play error:", err);
        setError("Ainda não foi possível carregar. Tente novamente.");
      });
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const fetchCurrentSong = async () => {
      try {
        // Fetch from our own server-side API to bypass CORS/Mixed Content
        const response = await fetch('/api/current-song', { cache: 'no-store' });

        if (response.ok) {
          const data = await response.json();
          if (data.song && data.song !== "Shekinah Fm") {
            setCurrentSong(data.song);
          }
          if (typeof data.listeners === 'number') {
            setListeners(data.listeners);
          }
          return;
        }
        
        if (currentSong === "Buscando música...") {
          setCurrentSong("Shekinah Fm");
        }
      } catch (err) {
        console.error("Error fetching current song from local API:", err);
      }
    };

    fetchCurrentSong();
    const interval = setInterval(fetchCurrentSong, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const radioName = import.meta.env.VITE_RADIO_NAME || "Shekinah Fm";
    if (currentSong && currentSong !== "Buscando música..." && currentSong !== radioName) {
      document.title = `${currentSong} | ${radioName}`;
    } else {
      document.title = `${radioName} | Ao Vivo`;
    }
  }, [currentSong]);

  useEffect(() => {
    // Attempt to auto-play on mount
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setError(null);
        })
        .catch(err => {
          console.log("Autoplay blocked or failed:", err);
          setIsPlaying(false);
        });
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setError(null);
        audioRef.current.load();
        audioRef.current.play().catch(err => {
          console.error("Playback failed:", err);
          setError("Falha ao carregar o streaming. Tente novamente.");
        });
      }
    }
  };

  const handleStationSelect = (station: Station) => {
    setCurrentStation(station);
    setError(null);
    if (audioRef.current) {
      audioRef.current.src = station.url;
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.error("Playback failed:", err);
        setError("Falha ao carregar o streaming.");
      });
    }
  };

  const handleShare = async () => {
    const radioName = import.meta.env.VITE_RADIO_NAME || "Shekinah Fm";
    const shareUrl = "https://ais-pre-7wll5ytnrrdpycemczlfpe-149764577483.us-west1.run.app";
    if (navigator.share) {
      try {
        await navigator.share({
          title: radioName,
          text: ' Gostaria de compartilhar com vc nosso aplicativo.',
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        // Silently copy or use a non-intrusive toast if needed, but removing alert as requested
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  const getWhatsAppUrl = () => {
    const radioName = import.meta.env.VITE_RADIO_NAME || "Shekinah Fm";
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "5514998793983";
    const message = encodeURIComponent(`Olá! Estou ouvindo a ${radioName} e gostaria de pedir uma música!`);
    return `https://wa.me/${whatsappNumber}?text=${message}`;
  };

  const getStudioVideoUrl = () => {
    const url = import.meta.env.VITE_STUDIO_VIDEO_URL;
    if (!url) return null;

    // Handle YouTube URLs (watch, live, shorts, embed, youtu.be)
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(ytRegex);
    
    if (match && match[1]) {
      return {
        type: 'youtube',
        url: `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&rel=0`
      };
    }

    // Check if it's a direct video stream (HLS/MP4)
    if (url.includes('.m3u8') || url.includes('.mp4')) {
      return {
        type: 'direct',
        url: url
      };
    }

    return {
      type: 'iframe',
      url: url
    };
  };

  const videoData = getStudioVideoUrl();

  useEffect(() => {
    if (isWebTVModalOpen && videoData?.type === 'direct' && videoData.url.includes('.m3u8') && videoRef.current) {
      const video = videoRef.current;
      
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoData.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("HLS play error:", e));
        });
        
        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = videoData.url;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log("Native HLS play error:", e));
        });
      }
    }
  }, [isWebTVModalOpen, videoData]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sidebar Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] sm:w-[320px] bg-zinc-950/50 backdrop-blur-md border-r border-zinc-800 z-50 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand/10 rounded-lg border border-brand/20">
                    <Radio className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-bold text-lg">Menu</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 bg-brand/10 border border-brand/20 rounded-full transition-all hover:bg-brand/20 text-brand hover:text-brand/80"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <button
                  onClick={() => {
                    setIsChatOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-brand/10 transition-colors group text-left"
                >
                  <div className="p-2 bg-brand/10 border border-brand/20 rounded-lg transition-colors group-hover:bg-brand/20">
                    <MessageSquare className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-medium">Chat da Rádio</span>
                </button>

                <button
                  onClick={() => {
                    setIsInfoModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-brand/10 transition-colors group text-left"
                >
                  <div className="p-2 bg-brand/10 border border-brand/20 rounded-lg transition-colors group-hover:bg-brand/20">
                    <Info className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-medium">Informações da Rádio</span>
                </button>

                <button
                  onClick={() => {
                    setIsWebTVModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-brand/10 transition-colors group text-left"
                >
                  <div className="p-2 bg-brand/10 border border-brand/20 rounded-lg transition-colors group-hover:bg-brand/20">
                    <Video className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-medium">WEB TV</span>
                </button>

                <div className="pt-4 pb-2 px-4">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Redes Sociais</span>
                </div>

                <a
                  href={import.meta.env.VITE_INSTAGRAM_URL || "https://instagram.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-brand/10 transition-colors group"
                >
                  <div className="p-2 bg-brand/10 border border-brand/20 rounded-lg transition-colors group-hover:bg-brand/20">
                    <Instagram className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-medium">Instagram</span>
                </a>

                <a
                  href={import.meta.env.VITE_FACEBOOK_URL || "https://facebook.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-brand/10 transition-colors group"
                >
                  <div className="p-2 bg-brand/10 border border-brand/20 rounded-lg transition-colors group-hover:bg-brand/20">
                    <Facebook className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-medium">Facebook</span>
                </a>
              </nav>

              <div className="p-6 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                  João Pessoa - PB
                </p>
                <p className="text-[10px] text-zinc-600 text-center mt-1">
                  Versão 1.0.0 • {getDeviceType().toUpperCase()}
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWebTVModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWebTVModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:h-auto max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl z-[60] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Video className="w-5 h-5 text-brand" />
                  WEB TV
                </h3>
                <button
                  onClick={() => setIsWebTVModalOpen(false)}
                  className="p-2 bg-brand/10 border border-brand/20 rounded-full transition-all hover:bg-brand/20 text-brand hover:text-brand/80"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 p-4 sm:p-8 flex flex-col items-center justify-center gap-6 overflow-y-auto">
                <div className="w-full aspect-video bg-black rounded-2xl flex flex-col items-center justify-center border border-zinc-800 relative overflow-hidden group">
                  {videoData ? (
                    videoData.type === 'direct' ? (
                      <video
                        ref={videoRef}
                        src={videoData.url.includes('.m3u8') ? undefined : videoData.url}
                        controls
                        autoPlay
                        muted
                        playsInline
                        referrerPolicy="no-referrer"
                        className="w-full h-full"
                      />
                    ) : (
                      <iframe
                        src={videoData.url}
                        referrerPolicy="no-referrer"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="p-4 bg-zinc-900/80 rounded-full backdrop-blur-md">
                          <Video className="w-12 h-12 text-zinc-500 animate-pulse" />
                        </div>
                        <p className="text-zinc-400 font-medium text-center px-4">
                          A transmissão de vídeo está temporariamente offline ou não configurada.
                        </p>
                      </div>
                      
                      {/* Decorative Scanline Effect */}
                      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                    </>
                  )}
                </div>

                <div className="w-full space-y-4">
                  <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl">
                    <p className="text-sm text-zinc-400 text-center italic">
                      {videoData 
                        ? "Você está assistindo à WEB TV da Rádio Shekinah FM ao vivo!" 
                        : '"Em breve você poderá acompanhar a WEB TV da Rádio Shekinah FM ao vivo!"'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-brand/5 rounded-xl border border-brand/20 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Status</span>
                      <span className={`text-xs font-medium ${videoData ? 'text-brand' : 'text-brand'}`}>
                        {videoData ? 'Ao Vivo' : 'Offline'}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Qualidade</span>
                      <span className="text-xs font-medium text-zinc-400">1080p HD</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                <button
                  onClick={() => setIsWebTVModalOpen(false)}
                  className="w-full py-4 bg-brand hover:bg-brand/80 text-zinc-950 font-bold rounded-2xl transition-all shadow-lg shadow-brand/20"
                >
                  Voltar para a Rádio
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInfoModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[15%] bottom-[15%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] sm:h-auto max-h-[70vh] bg-zinc-900 border border-zinc-800 rounded-3xl z-[60] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-brand" />
                  Informações da Rádio
                </h3>
                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className="p-2 bg-brand/10 border border-brand/20 rounded-full transition-all hover:bg-brand/20 text-brand hover:text-brand/80"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <img 
                    src={currentStation.logo} 
                    alt={currentStation.name} 
                    className="w-24 h-24 rounded-2xl shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-2xl font-bold text-white">{currentStation.name}</h4>
                    <p className="text-brand font-medium">{currentStation.genre}</p>
                  </div>
                </div>
                
                <div className="space-y-4 text-zinc-300 leading-relaxed">
                  <p>
                    A {currentStation.name} é a sua rádio gospel 24 horas no ar, levando a palavra de Deus e as melhores músicas para o seu coração.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="p-4 bg-brand/5 rounded-2xl border border-brand/20">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Localização</span>
                      <span className="text-sm font-medium">João Pessoa - PB</span>
                    </div>
                    <div className="p-4 bg-brand/5 rounded-2xl border border-brand/20">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Transmissão</span>
                      <span className="text-sm font-medium">Digital HD</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className="w-full py-4 bg-brand hover:bg-brand/80 text-zinc-950 font-bold rounded-2xl transition-all shadow-lg shadow-brand/20"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Chat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      <audio 
        ref={audioRef} 
        src={currentStation.url} 
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          setError(null);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          console.log("Audio ended, attempting to reconnect...");
          handleRetry();
        }}
        onStalled={() => {
          console.warn("Audio stalled, buffering...");
        }}
        onWaiting={() => {
          console.log("Audio waiting for data...");
        }}
        onError={(e) => {
          console.error("Audio error occurred");
          setIsPlaying(false);
          setError("O streaming não pôde ser carregado. Tente novamente em instantes.");
        }}
      />

      {/* Header */}
      <header className="p-3 sm:p-4 md:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10 w-full">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-brand/10 border border-brand/20 rounded-lg transition-all hover:bg-brand/20 text-brand hover:text-brand/80"
            title="Menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-brand/10 rounded-lg border border-brand/20 shrink-0">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-brand" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[12px] sm:text-[14px] md:text-[18px] font-display font-bold truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none leading-tight">
                {import.meta.env.VITE_RADIO_NAME || "Shekinah Fm"}
              </h1>
              <span className="text-[10px] sm:text-xs text-zinc-500 font-medium truncate">
                João Pessoa - PB
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm text-zinc-400">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 bg-brand/10 hover:bg-brand/20 text-brand px-3 py-1.5 rounded-full transition-colors border border-brand/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Instalar App</span>
            </button>
          )}
          <span className="flex items-center gap-1.5 sm:gap-2">
            <Users className="w-3.5 h-3.5 text-brand" />
            <AnimatePresence mode="wait">
              <motion.span
                key={listeners}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="inline"
              >
                {listeners} ouvintes
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isPlaying ? 'bg-brand animate-pulse' : 'bg-zinc-600'}`} />
            <span className="inline">{isPlaying ? 'Ao Vivo' : 'Pausado'}</span>
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-6 md:p-8 flex items-center justify-center">
        {/* Player Section */}
        <section className="w-full max-w-3xl flex flex-col gap-4 sm:gap-8">
          <motion.div 
            animate={isPlaying ? { 
              borderColor: `${brandColor}66`,
              boxShadow: `0 0 30px ${brandColor}26, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`
            } : { 
              borderColor: "rgba(39, 39, 42, 1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
            transition={{ duration: 0.5 }}
            className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 flex flex-col items-center text-center border shadow-2xl"
          >
            <div className="relative group w-full flex justify-center">
              <motion.img
                key={currentStation.logo}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={currentStation.logo}
                alt={currentStation.name}
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-cover rounded-xl md:rounded-2xl shadow-2xl mb-6 md:mb-8"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2 w-full">
              <h2 className="text-[21px] sm:text-[27px] md:text-[33px] lg:text-[45px] font-display font-bold tracking-tight leading-tight">{currentStation.name}</h2>
              <p className="text-zinc-400 text-xs sm:text-sm md:text-base font-medium mt-1">
                João Pessoa - PB
              </p>
              <p className="font-medium flex items-center justify-center gap-2 mt-2" style={{ color: brandColor }}>
                <Music2 className="w-4 h-4 sm:w-5 sm:h-5" />
                {currentStation.genre}
              </p>

              {/* Sound Waves Visualizer */}
              <div className="flex justify-center items-end h-10 sm:h-12 md:h-16 gap-1 sm:gap-1.5 my-4 md:my-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <motion.div
                    key={i}
                    animate={isPlaying ? { height: [10, 35, 15, 40, 10] } : { height: 4 }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 sm:w-1.5 rounded-full"
                    style={{ backgroundColor: isPlaying ? brandColor : 'rgb(63 63 70)' }}
                  />
                ))}
              </div>

              {/* Current Song Display Enhanced */}
              <div 
                className="rounded-2xl p-6 backdrop-blur-sm min-h-[100px] flex items-center justify-center border"
                style={{ 
                  backgroundColor: `${brandColor}0D`,
                  borderColor: `${brandColor}1A`
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentSong}-${isPlaying}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] sm:text-xs tracking-[0.3em] font-bold opacity-70" style={{ color: brandColor }}>
                      {isPlaying ? "Reproduzindo a Música" : "Aperte o play para tocar"}
                    </span>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white text-center leading-tight max-w-md">
                      {currentSong}
                    </h3>
                  </motion.div>
                </AnimatePresence>
              </div>

              {error && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm"
                  >
                    {error}
                  </motion.p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRetry}
                      className="text-xs bg-brand/20 hover:bg-brand/30 text-brand px-4 py-2 rounded-full transition-colors flex items-center gap-2 border border-brand/20"
                    >
                      Tentar Novamente
                    </button>
                    <button
                      onClick={() => window.open(currentStation.url, '_blank')}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-full transition-colors flex items-center gap-2"
                    >
                      Abrir rádio em nova aba
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 max-w-xs">
                    Dica: Se o áudio não tocar, clique no cadeado da barra de endereços e permita "Conteúdo Inseguro".
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 sm:mt-8 md:mt-12 flex flex-col items-center gap-6 md:gap-8 w-full max-w-md">
              <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10">
                <button 
                  type="button"
                  onClick={handleShare}
                  className="p-3 sm:p-4 rounded-full transition-all hover:scale-110 border"
                  style={{ 
                    backgroundColor: `${brandColor}1A`,
                    borderColor: `${brandColor}33`,
                    color: brandColor
                  }}
                  title="Compartilhar"
                >
                  <Share2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </button>

                <button 
                  type="button"
                  onClick={togglePlay}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg border"
                  style={{ 
                    backgroundColor: `${brandColor}1A`,
                    borderColor: `${brandColor}33`,
                    color: brandColor,
                    boxShadow: `0 10px 40px -10px ${brandColor}33`
                  }}
                >
                  {isPlaying ? <Pause className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 fill-current" /> : <Play className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 fill-current ml-1" />}
                </button>

                <a 
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 sm:p-4 rounded-full transition-all hover:scale-110"
                  style={{ 
                    backgroundColor: `${brandColor}33`,
                    color: brandColor
                  }}
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </a>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 w-full px-2 sm:px-4">
                <button onClick={() => setIsMuted(!isMuted)} className="text-brand hover:text-brand/80 shrink-0">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 sm:h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: brandColor }}
                />
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
