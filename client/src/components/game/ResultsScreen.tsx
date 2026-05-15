"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/hooks/useSocket";
import { useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function ResultsScreen() {
  const { room, currentPlayer } = useGameStore();
  const { resetGame, leaveRoom, isHost } = useSocket();
  const [resetting, setResetting] = useState(false);

  if (!room || !currentPlayer) return null;

  const sortedPlayers = [...room.players].sort(
    (a, b) => (room.scores[b.socketId] || 0) - (room.scores[a.socketId] || 0)
  );

  const handlePlayAgain = async () => {
    setResetting(true);
    const res = await resetGame();
    if (!res.success) {
      toast.error(res.error || "Failed to reset");
      setResetting(false);
    }
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 relative overflow-hidden">
      <div className="orb w-80 h-80 bg-neon-orange/10 top-0 right-0" />
      <div className="orb w-64 h-64 bg-accent/10 bottom-0 left-0" />
      <div className="bg-grid fixed inset-0 z-0" />
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h2 className="font-display font-extrabold text-4xl text-white mb-2">
            Game Over!
          </h2>
          <p className="text-dim text-sm">
            {room.totalRounds} rounds completed
          </p>
        </motion.div>

        {/* Scoreboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card mb-6"
        >
          <h3 className="font-display font-bold text-sm text-faint uppercase tracking-widest mb-4">
            Final Standings
          </h3>
          <div className="space-y-3">
            {sortedPlayers.map((player, i) => {
              const score = room.scores[player.socketId] || 0;
              const isCurrentPlayer = player.id === currentPlayer.id;
              const maxScore = room.scores[sortedPlayers[0]?.socketId] || 1;
              const progress = maxScore > 0 ? (score / maxScore) * 100 : 0;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-xl",
                    isCurrentPlayer ? "bg-accent/10 border border-accent/20" : "bg-surface"
                  )}
                >
                  <span className="text-xl w-7 text-center">
                    {i < 3 ? medals[i] : <span className="text-dim text-sm font-mono">#{i + 1}</span>}
                  </span>

                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${player.color}20`, border: `1px solid ${player.color}40` }}
                  >
                    {player.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-semibold text-sm text-white truncate">
                        {player.nickname}
                        {isCurrentPlayer && (
                          <span className="ml-1 text-[10px] text-accent font-mono">(you)</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-sm text-white ml-2 flex-shrink-0">
                        {score} pts
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: player.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-3"
        >
          {isHost ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlayAgain}
              disabled={resetting}
              className="btn-primary w-full py-5 text-lg"
            >
              {resetting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : (
                "🎮 Play Again"
              )}
            </motion.button>
          ) : (
            <div className="card text-center py-4">
              <p className="text-dim text-sm">
                Waiting for host to start a new game...
              </p>
            </div>
          )}

          <button onClick={leaveRoom} className="w-full btn-ghost text-center py-3">
            Leave Room
          </button>
        </motion.div>
      </div>
    </div>
  );
}
