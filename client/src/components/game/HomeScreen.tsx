"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import toast from "react-hot-toast";

type Mode = "home" | "create" | "join";

export default function HomeScreen() {
  const [mode, setMode] = useState<Mode>("home");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { createRoom, joinRoom } = useSocket();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!nickname.trim()) return toast.error("Enter your nickname");
    if (nickname.trim().length < 2) return toast.error("Nickname too short");
    setLoading(true);
    const res = await createRoom(nickname.trim());
    if (!res.success) toast.error(res.error || "Failed to create room");
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) return toast.error("Enter your nickname");
    if (!roomCode.trim()) return toast.error("Enter room code");
    setLoading(true);
    const res = await joinRoom(nickname.trim(), roomCode.trim().toUpperCase());
    if (!res.success) toast.error(res.error || "Failed to join room");
    setLoading(false);
  };

  const goToMode = (m: Mode) => {
    setMode(m);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb w-96 h-96 bg-accent/20 -top-32 -left-32" />
      <div className="orb w-80 h-80 bg-electric/10 bottom-0 right-0" />
      <div className="bg-grid fixed inset-0 z-0" />
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center text-xl shadow-glow">
              🕵️
            </div>
            <span className="font-mono text-xs text-faint uppercase tracking-[0.2em]">v1.0</span>
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-none mb-2">
            <span className="glow-text">IMPOSTER</span>
            <br />
            <span className="text-ghost">WORD</span>
          </h1>
          <p className="text-dim text-sm font-body mt-3">
            Social deduction. Real words. Hidden identities.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => goToMode("create")}
                className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
              >
                <span>✦</span>
                Create Room
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => goToMode("join")}
                className="btn-secondary w-full text-lg py-4 flex items-center justify-center gap-3"
              >
                <span>→</span>
                Join Room
              </motion.button>
            </motion.div>
          )}

          {(mode === "create" || mode === "join") && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="card space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display font-bold text-xl text-white">
                  {mode === "create" ? "✦ Create Room" : "→ Join Room"}
                </h2>
                <button onClick={() => setMode("home")} className="btn-ghost text-sm">
                  ← Back
                </button>
              </div>

              <div>
                <label className="text-faint text-xs font-mono uppercase tracking-widest block mb-2">
                  Your Nickname
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  className="input-field"
                  placeholder="e.g. ShadowFox"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (mode === "create") handleCreate();
                      else if (roomCode) handleJoin();
                    }
                  }}
                />
              </div>

              {mode === "join" && (
                <div>
                  <label className="text-faint text-xs font-mono uppercase tracking-widest block mb-2">
                    Room Code
                  </label>
                  <input
                    type="text"
                    className="input-field font-mono text-xl tracking-[0.3em] uppercase"
                    placeholder="XXXXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  />
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={mode === "create" ? handleCreate : handleJoin}
                disabled={loading}
                className="btn-primary w-full py-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "create" ? "Creating..." : "Joining..."}
                  </span>
                ) : (
                  mode === "create" ? "Create Room →" : "Join Room →"
                )}
              </motion.button>

              <p className="text-faint text-xs text-center">
                No account needed. Just play.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How to play */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-faint text-xs font-mono">
            2–12 players · Social deduction · Party game
          </p>
        </motion.div>
      </div>
    </div>
  );
}
