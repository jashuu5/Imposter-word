"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { useSocket } from "@/hooks/useSocket";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function VotingScreen() {
  const { room, currentPlayer, readyCount, playerCount } = useGameStore();
  const { submitVote, isHost, socketId } = useSocket();
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!room || !currentPlayer) return null;

  const voteProgress = playerCount > 0 ? (readyCount / playerCount) * 100 : 0;

  const handleVote = async (targetId: string) => {
    if (votedFor || submitting) return;
    setSubmitting(true);
    setVotedFor(targetId);
    
    const res = await submitVote(targetId);
    if (!res.success) {
      toast.error(res.error || "Failed to submit vote");
      setVotedFor(null);
    }
    setSubmitting(false);
  };

  const endVotingEarly = async () => {
     // host can end it early if they want, but usually it auto-ends
     const socket = (await import("@/lib/socket")).getSocket();
     socket.emit("game:endVoting", { roomCode: room.code });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 relative overflow-hidden">
      <div className="orb w-80 h-80 bg-accent/10 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="bg-grid fixed inset-0 z-0" />
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-md space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="text-faint text-xs font-mono uppercase tracking-widest">
            Round {room.currentRound}
          </span>
          <h2 className="font-display font-extrabold text-3xl text-white mt-1">
            Who is the Imposter?
          </h2>
          <p className="text-dim text-sm mt-2">
            Vote for the player you think is the imposter!
          </p>
        </motion.div>

        <div className="space-y-3">
          <AnimatePresence>
            {room.players.map((player) => {
              const isMe = player.socketId === currentPlayer.socketId;
              const isSelected = votedFor === player.socketId;

              return (
                <motion.button
                  key={player.id}
                  onClick={() => !isMe && handleVote(player.socketId)}
                  disabled={votedFor !== null || isMe}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={!isMe && !votedFor ? { scale: 1.02 } : {}}
                  whileTap={!isMe && !votedFor ? { scale: 0.98 } : {}}
                  className={clsx(
                    "w-full flex items-center p-4 rounded-xl border transition-all duration-200 relative overflow-hidden",
                    isMe
                      ? "bg-surface/30 border-border/50 opacity-50 cursor-not-allowed"
                      : isSelected
                      ? "bg-accent/20 border-accent text-white"
                      : "bg-surface border-border hover:border-accent/50 text-dim hover:text-white",
                     (votedFor && !isSelected) && "opacity-50 grayscale"
                  )}
                >
                  {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent" />}
                  <div className="flex-1 flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: `${player.color}20`, border: `1px solid ${player.color}50` }}>
                      {player.avatar}
                    </div>
                    <span className="font-display font-semibold text-lg">
                      {player.nickname} {isMe && "(You)"}
                    </span>
                  </div>
                  {isSelected && (
                     <div className="text-accent text-xl relative z-10">✓</div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mt-6"
        >
          <div>
            <div className="flex justify-between text-xs font-mono text-faint mb-1.5">
              <span>Votes Cast</span>
              <span className="text-white">{readyCount}/{playerCount}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${voteProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {isHost && (
            <motion.button
               onClick={endVotingEarly}
               className="w-full btn-secondary text-sm py-3 mt-4 text-faint hover:text-white"
            >
               Force End Voting (Host)
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
