"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/hooks/useSocket";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function RevealScreen() {
  const { room, currentPlayer, roundData, revealData, isReady, readyCount, playerCount } = useGameStore();
  const { markReady, isHost } = useSocket();

  if (!room || !revealData || !roundData) return null;

  const imposterPlayer = room.players.find((p) => p.socketId === revealData.imposterSocketId);
  const isImposter = currentPlayer?.socketId === revealData.imposterSocketId;
  const readyProgress = playerCount > 0 ? (readyCount / playerCount) * 100 : 0;

  const handleReady = async () => {
    if (isReady) return;
    const res = await markReady();
    if (!res.success) toast.error(res.error || "Failed");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-neon-pink/10 top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="bg-grid fixed inset-0 z-0" />
      <div className="noise-overlay" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md space-y-5"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-faint text-xs font-mono uppercase tracking-widest mb-1">Round {roundData.round} · Reveal</p>
          <h2 className="font-display font-extrabold text-3xl text-white">The Imposter Was...</h2>
        </motion.div>

        {/* Imposter reveal */}
        <motion.div
          variants={itemVariants}
          className="card text-center py-10 border-neon-pink/40 relative overflow-hidden"
          style={{ boxShadow: "0 0 40px rgba(236,72,153,0.2)" }}
        >
          <div className="absolute inset-0 bg-gradient-radial from-neon-pink/10 to-transparent opacity-50" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="relative z-10"
          >
            <div
              className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-4xl mb-4 relative"
              style={{
                backgroundColor: `${imposterPlayer?.color || "#ec4899"}20`,
                border: `2px solid ${imposterPlayer?.color || "#ec4899"}60`,
              }}
            >
              {imposterPlayer?.avatar || "🕵️"}
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-neon-pink rounded-full flex items-center justify-center text-sm">
                🕵️
              </div>
            </div>
            <h3 className="font-display font-extrabold text-3xl text-neon-pink mb-1">
              {revealData.imposterNickname}
            </h3>
            {isImposter && (
              <span className="text-xs font-mono bg-neon-pink/10 border border-neon-pink/20 text-neon-pink px-2 py-1 rounded-full mt-2 inline-block">
                That's you!
              </span>
            )}
            {revealData.imposterCaught !== undefined && (
               <div className={clsx(
                  "mt-4 text-sm font-bold font-mono px-3 py-1.5 rounded-full inline-block",
                  revealData.imposterCaught 
                     ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                     : "bg-neon-red/10 text-neon-red border border-neon-red/20"
               )}>
                  {revealData.imposterCaught ? "🎯 Imposter Caught!" : "👻 Imposter Escaped!"}
               </div>
            )}
          </motion.div>
        </motion.div>

        {/* Word comparison */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="card text-center border-accent/30">
            <p className="text-faint text-xs font-mono uppercase tracking-widest mb-2">Everyone's Word</p>
            <p className="font-display font-bold text-2xl text-white">{revealData.normalWord}</p>
          </div>
          <div className="card text-center border-neon-pink/30">
            <p className="text-faint text-xs font-mono uppercase tracking-widest mb-2">Imposter's Word</p>
            <p className={clsx(
              "font-display font-bold text-2xl",
              revealData.imposterWord === "❓ You are the Imposter"
                ? "text-neon-pink text-lg"
                : "text-neon-pink"
            )}>
              {revealData.imposterWord}
            </p>
          </div>
        </motion.div>

        {/* Category */}
        <motion.div variants={itemVariants} className="text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric/10 border border-electric/20">
            <span className="text-electric-light text-xs font-mono uppercase tracking-widest">
              Category: {revealData.category}
            </span>
          </span>
        </motion.div>

        {/* Who scored this round */}
        {revealData.correctVoters && revealData.correctVoters.length > 0 && (
          <motion.div variants={itemVariants} className="card border-neon-green/20 bg-neon-green/5">
            <p className="text-faint text-xs font-mono uppercase tracking-widest mb-2">🎯 Scored +1 this round</p>
            <div className="flex flex-wrap gap-2">
              {revealData.correctVoters.map((voterId) => {
                const p = room.players.find((pl) => pl.socketId === voterId);
                if (!p) return null;
                return (
                  <span key={voterId} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neon-green/10 border border-neon-green/20 text-neon-green text-sm font-display font-semibold">
                    {p.avatar} {p.nickname}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
        {revealData.imposterCaught === false && (
          <motion.div variants={itemVariants} className="card border-neon-pink/20 bg-neon-pink/5">
            <p className="text-faint text-xs font-mono uppercase tracking-widest mb-1">😈 Imposter scored +1</p>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-sm font-display font-semibold w-fit">
              {imposterPlayer?.avatar} {revealData.imposterNickname}
            </span>
          </motion.div>
        )}

        {/* Continue section */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-mono text-faint mb-1.5">
              <span>Ready for next round</span>
              <span className="text-white">{readyCount}/{playerCount}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                animate={{ width: `${readyProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: isReady ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReady}
            disabled={isReady}
            className={clsx(
              "w-full py-5 rounded-xl font-display font-bold text-lg transition-all duration-200",
              isReady
                ? "bg-neon-green/10 border border-neon-green/30 text-neon-green cursor-default"
                : "btn-primary"
            )}
          >
            {isReady ? "✓ Ready!" : "Continue →"}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
