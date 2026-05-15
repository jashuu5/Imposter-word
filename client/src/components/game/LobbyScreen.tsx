"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/hooks/useSocket";
import PlayerCard from "./PlayerCard";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function LobbyScreen() {
  const { room, currentPlayer } = useGameStore();
  const { startGame, updateSettings, leaveRoom, isHost } = useSocket();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!room || !currentPlayer) return null;

const copyCode = () => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(room.code);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = room.code;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }

  setCopied(true);
  toast.success("Room code copied!");
  setTimeout(() => setCopied(false), 2000);
};

  const handleStart = async () => {
    if (room.players.length < 2) {
      return toast.error("Need at least 2 players");
    }
    setStarting(true);
    const res = await startGame();
    if (!res.success) {
      toast.error(res.error || "Failed to start");
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 relative overflow-hidden">
      <div className="orb w-64 h-64 bg-accent/15 -top-16 -right-16" />
      <div className="bg-grid fixed inset-0 z-0" />
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-neon-green rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
              <span className="text-dim text-xs font-mono uppercase tracking-widest">Live Room</span>
            </div>
            <h2 className="font-display font-bold text-2xl text-white">Waiting Lobby</h2>
          </div>
          <button onClick={leaveRoom} className="btn-ghost text-sm text-neon-red/70 hover:text-neon-red">
            Leave →
          </button>
        </motion.div>

        {/* Room Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center relative overflow-hidden"
        >
          <div className="shimmer absolute inset-0" />
          <p className="text-faint text-xs font-mono uppercase tracking-widest mb-2">Room Code</p>
          <div className="font-mono font-bold text-4xl tracking-[0.4em] text-white mb-4 glow-text">
            {room.code}
          </div>
          <button
            onClick={copyCode}
            className={clsx(
              "btn-secondary text-sm transition-all duration-200",
              copied && "border-neon-green/50 text-neon-green"
            )}
          >
            {copied ? "✓ Copied!" : "Copy Code"}
          </button>
          <p className="text-faint text-xs mt-3">Share this code with your friends</p>
        </motion.div>

        {/* Players */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-dim text-sm font-mono">
              Players{" "}
              <span className="text-white font-bold">{room.players.length}</span>
              <span className="text-faint">/12</span>
            </span>
            {room.players.length < 2 && (
              <span className="text-neon-orange text-xs font-mono">Need 1 more player</span>
            )}
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {room.players.map((player, i) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer.id}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Settings (Host only) */}
        {isHost && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full btn-secondary flex items-center justify-between"
            >
              <span>⚙️ Game Settings</span>
              <span className={clsx("transition-transform duration-200", showSettings && "rotate-180")}>▾</span>
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card mt-2 space-y-4 overflow-hidden"
                >
                  {/* Rounds */}
                  <div>
                    <label className="text-faint text-xs font-mono uppercase tracking-widest block mb-2">
                      Total Rounds: <span className="text-white">{room.settings.totalRounds}</span>
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={room.settings.totalRounds}
                      onChange={(e) => updateSettings({ totalRounds: parseInt(e.target.value) })}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-faint text-xs mt-1">
                      <span>2</span><span>10</span>
                    </div>
                  </div>

                  {/* Game Mode */}
                  <div>
                    <label className="text-faint text-xs font-mono uppercase tracking-widest block mb-2">
                      Imposter Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["related", "classic"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateSettings({ gameMode: mode })}
                          className={clsx(
                            "px-3 py-2 rounded-lg border text-sm font-display font-semibold transition-all duration-200",
                            room.settings.gameMode === mode
                              ? "border-accent bg-accent/20 text-accent-light"
                              : "border-border bg-surface text-dim hover:border-subtle"
                          )}
                        >
                          {mode === "related" ? "🔀 Related Word" : "❓ Classic"}
                        </button>
                      ))}
                    </div>
                    <p className="text-faint text-xs mt-2">
                      {room.settings.gameMode === "related"
                        ? "Imposter gets a related but different word"
                        : "Imposter sees '❓ You are the Imposter'"}
                    </p>
                  </div>
                  
                  {/* Imposter Role Toggle */}
                  {room.settings.gameMode === "related" && (
                     <div className="flex items-center justify-between">
                        <div>
                           <label className="text-white text-sm font-semibold block mb-0.5">
                              Show Imposter Role
                           </label>
                           <p className="text-faint text-xs">
                              {room.settings.showImposterRole
                                 ? "Imposter knows they are the imposter"
                                 : "Imposter doesn't know they have a different word"}
                           </p>
                        </div>
                        <button
                           onClick={() => updateSettings({ showImposterRole: !room.settings.showImposterRole })}
                           className={clsx(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              room.settings.showImposterRole ? "bg-neon-green" : "bg-muted"
                           )}
                        >
                           <span className={clsx(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              room.settings.showImposterRole ? "translate-x-6" : "translate-x-1"
                           )} />
                        </button>
                     </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Start / Waiting */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {isHost ? (
            <motion.button
              whileHover={{ scale: room.players.length >= 2 ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={starting || room.players.length < 2}
              className="btn-primary w-full py-5 text-lg"
            >
              {starting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                "🎮 Start Game"
              )}
            </motion.button>
          ) : (
            <div className="card text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse-slow" />
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse-slow" style={{ animationDelay: "0.2s" }} />
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse-slow" style={{ animationDelay: "0.4s" }} />
              </div>
              <p className="text-dim text-sm">
                Waiting for{" "}
                <span className="text-accent-light font-semibold">
                  {room.players.find((p) => p.socketId === room.host)?.nickname || "host"}
                </span>{" "}
                to start
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
