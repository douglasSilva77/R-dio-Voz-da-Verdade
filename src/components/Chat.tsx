import React, { useState, useEffect, useRef } from "react";
import { Send, User, X, MessageSquare, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  color: string;
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const USER_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", 
  "#06b6d4", "#f97316", "#6366f1", "#a855f7", "#fbbf24"
];

export const Chat: React.FC<ChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("chat_user_name") || "");
  const [tempName, setTempName] = useState("");
  const [userColor] = useState(() => {
    const saved = localStorage.getItem("chat_user_color");
    if (saved) return saved;
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    localStorage.setItem("chat_user_color", color);
    return color;
  });
  
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "history") {
        setMessages(data.messages);
      } else if (data.type === "chat") {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    socket.onclose = () => {
      console.log("Chat disconnected, retrying...");
      // Reconnect logic could be added here
    };

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const message = {
      type: "chat",
      user: userName || "Anônimo",
      text: inputText.trim(),
      color: userColor
    };

    socketRef.current.send(JSON.stringify(message));
    setInputText("");
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    setUserName(tempName.trim());
    localStorage.setItem("chat_user_name", tempName.trim());
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(timestamp);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />

          {/* Chat Window */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-zinc-900 border-l border-zinc-800 z-[70] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg border border-brand/20">
                  <MessageSquare className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Chat da Rádio</h3>
                  <p className="text-[10px] text-brand uppercase tracking-widest font-bold">Ao Vivo</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-brand/10 border border-brand/20 rounded-full transition-all hover:bg-brand/20 text-brand hover:text-brand/80"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!userName ? (
              /* Name Setup */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-brand" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold">Como quer ser chamado?</h4>
                  <p className="text-zinc-400 text-sm">Escolha um nome para participar do chat da nossa rádio.</p>
                </div>
                <form onSubmit={handleSaveName} className="w-full space-y-4">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Seu nome ou apelido"
                    maxLength={20}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand transition-colors text-center font-medium"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full bg-brand hover:bg-brand/80 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-brand/20"
                  >
                    Entrar no Chat
                  </button>
                </form>
              </div>
            ) : (
              /* Chat Interface */
              <>
                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 opacity-50">
                      <MessageSquare className="w-8 h-8" />
                      <p className="text-sm">Nenhuma mensagem ainda...</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={`flex flex-col ${msg.user === userName ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span 
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: msg.color }}
                          >
                            {msg.user}
                          </span>
                          <span className="text-[9px] text-zinc-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                        <div 
                          className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.user === userName 
                              ? "bg-brand text-zinc-950 rounded-tr-none font-medium" 
                              : "bg-zinc-800 text-zinc-100 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Escreva sua mensagem..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-brand transition-colors text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-4 bg-brand hover:bg-brand/80 disabled:opacity-50 disabled:hover:bg-brand text-zinc-950 rounded-2xl transition-all shadow-lg shadow-brand/10 shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <div className="mt-4 flex items-center justify-between px-1">
                    <button 
                      onClick={() => {
                        localStorage.removeItem("chat_user_name");
                        setUserName("");
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest font-bold"
                    >
                      Alterar Nome
                    </button>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      Logado como <span className="text-brand">{userName}</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
