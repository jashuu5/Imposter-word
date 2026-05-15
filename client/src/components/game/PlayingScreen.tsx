"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/hooks/useSocket";
import PlayerCard from "./PlayerCard";
import toast from "react-hot-toast";
import clsx from "clsx";

const REACTIONS = ["😂", "🤔", "😱", "👀", "🫡", "🤫", "😏", "🧐"];

export default function PlayingScreen() {
  const { room, currentPlayer, roundData, isReady, readyCount, playerCount } = useGameStore();
  const { markReady, startVoting, isHost, sendReaction } = useSocket();
  const [wordRevealed, setWordRevealed] = useState(false);
  const [startingVote, setStartingVote] = useState(false);
  const [readying, setReadying] = useState(false);

  // Reset reveal when round changes
  useEffect(() => {
    setWordRevealed(false);
  }, [roundData?.round]);

  if (!room || !currentPlayer || !roundData) return null;

  const readyProgress = playerCount > 0 ? (readyCount / playerCount) * 100 : 0;

  const handleMarkReady = async () => {
    if (isReady || readying) return;
    setReadying(true);
    const res = await markReady();
    if (!res.success) {
      toast.error(res.error || "Failed");
      setReadying(false);
    }
  };

  const handleStartVoting = async () => {
    setStartingVote(true);
    const res = await startVoting();
    if (!res.success) {
      toast.error(res.error || "Failed to start voting");
      setStartingVote(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 relative overflow-hidden">
      <div className="orb w-80 h-80 bg-accent/10 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="bg-grid fixed inset-0 z-0" />
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-md space-y-5">
        {/* Round indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <span className="text-faint text-xs font-mono uppercase tracking-widest">
              Round
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-extrabold text-3xl text-white">
                {roundData.round}
              </span>
              <span className="text-faint text-sm font-mono">/ {roundData.totalRounds}</span>
            </div>
          </div>

          {/* Round progress */}
          <div className="flex gap-1">
            {Array.from({ length: roundData.totalRounds }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "h-1.5 w-5 rounded-full transition-all duration-300",
                  i < roundData.round ? "bg-accent" : "bg-muted"
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Category badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric/10 border border-electric/20"
        >
          <span className="w-1.5 h-1.5 bg-electric rounded-full" />
          <span className="text-electric-light text-xs font-mono uppercase tracking-widest">
            Category: {roundData.category}
          </span>
        </motion.div>

        {/* Word Card - THE MAIN ELEMENT */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
          className="relative"
        >
          <AnimatePresence mode="wait">
            {!wordRevealed ? (
              <motion.button
                key="hidden"
                onClick={() => setWordRevealed(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full card text-center py-16 cursor-pointer group relative overflow-hidden"
                style={{ borderColor: "rgba(124, 58, 237, 0.3)" }}
              >
                <div className="shimmer absolute inset-0 opacity-50" />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-5xl mb-4"
                >
                  🔒
                </motion.div>
                <p className="text-dim font-display font-semibold text-lg mb-1">Your word is hidden</p>
                <p className="text-faint text-sm">Tap to reveal — show only to yourself!</p>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 group-hover:to-accent/10 transition-all duration-300" />
              </motion.button>
            ) : (
              <motion.div
                key="revealed"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={clsx(
                  "card text-center py-10 relative overflow-hidden",
                  roundData.isImposter
                    ? "border-neon-pink/40 shadow-[0_0_30px_rgba(236,72,153,0.2)]"
                    : "border-accent/40 shadow-glow/50"
                )}
              >
                {/* Background glow based on role */}
                <div
                  className={clsx(
                    "absolute inset-0 opacity-5",
                    roundData.isImposter
                      ? "bg-gradient-radial from-neon-pink to-transparent"
                      : "bg-gradient-radial from-accent to-transparent"
                  )}
                />

                <div className="relative z-10">
                  <p className="text-faint text-xs font-mono uppercase tracking-widest mb-3">
                    {roundData.isImposter ? "⚠️ Your Secret Role" : "Your Word"}
                  </p>

                  <div className={clsx(
                    "font-display font-extrabold leading-none mb-4",
                    roundData.yourWord.length > 12 ? "text-3xl" : "text-5xl",
                    roundData.isImposter ? "text-neon-pink" : "text-white"
                  )}>
                    {roundData.yourWord}
                  </div>

                  {roundData.isImposter && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-3 px-4 py-2.5 rounded-xl bg-neon-pink/10 border border-neon-pink/20"
                    >
                      <p className="text-neon-pink text-sm font-display font-semibold">
                        🕵️ You are the Imposter!
                      </p>
                      <p className="text-neon-pink/60 text-xs mt-1">
                        Blend in — don't get caught
                      </p>
                    </motion.div>
                  )}

                  {!roundData.isImposter && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-3 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20"
                    >
                      <p className="text-accent-light text-sm font-display font-semibold">
                        ✅ You know the word
                      </p>
                      <p className="text-accent-light/60 text-xs mt-1">
                        Find the imposter among you
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card bg-surface/50 text-center py-4"
        >
          <p className="text-dim text-sm">
            💬 Discuss <span className="text-white font-semibold">in real life</span> to find the imposter
          </p>
          <p className="text-faint text-xs mt-1">
            Don't say your word directly!
          </p>
        </motion.div>

        {/* Reactions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2 justify-center flex-wrap"
        >
          {REACTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => sendReaction(emoji)}
              className="w-10 h-10 rounded-xl bg-surface border border-border hover:border-subtle flex items-center justify-center text-xl transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>

        {/* Ready section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs font-mono text-faint mb-1.5">
              <span>Ready to continue</span>
              <span className="text-white">{readyCount}/{playerCount}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${readyProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Host: Start Voting */}
          {isHost && (
            <motion.button
              whileHover={{ scale: startingVote ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartVoting}
              disabled={startingVote}
              className="w-full btn-secondary border-accent/30 text-accent hover:border-accent/60 hover:bg-accent/5"
            >
              {startingVote ? "Starting Vote..." : "🗳️ Start Voting"}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: isReady ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMarkReady}
            disabled={isReady || readying}
            className={clsx(
              "w-full py-5 rounded-xl font-display font-bold text-lg transition-all duration-200",
              isReady
                ? "bg-neon-green/10 border border-neon-green/30 text-neon-green cursor-default"
                : "btn-primary"
            )}
          >
            {isReady ? "✓ Ready for next round" : "Next Round →"}
          </motion.button>
        </motion.div>

        {/* Player list with ready status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-faint text-xs font-mono uppercase tracking-widest mb-2">Players</p>
          <div className="space-y-2">
            <AnimatePresence>
              {room.players.map((player, i) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer.id}
                  isReady={player.socketId === currentPlayer.socketId ? isReady : false}
                  showReadyState
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
