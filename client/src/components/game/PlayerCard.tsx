"use client";

import { motion } from "framer-motion";
import { Player } from "@/types";
import clsx from "clsx";

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
  isReady?: boolean;
  showReadyState?: boolean;
  index?: number;
}

export default function PlayerCard({
  player,
  isCurrentPlayer,
  isReady,
  showReadyState,
  index = 0,
}: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={clsx(
        "relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
        isCurrentPlayer
          ? "border-accent/50 bg-accent/5 shadow-glow/30"
          : "border-border bg-surface",
        showReadyState && isReady && "border-neon-green/40 bg-neon-green/5"
      )}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative"
        style={{ backgroundColor: `${player.color}20`, border: `1px solid ${player.color}40` }}
      >
        {player.avatar}
        {player.isHost && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-orange rounded-full flex items-center justify-center text-[8px]">
            👑
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-white truncate">
            {player.nickname}
          </span>
          {isCurrentPlayer && (
            <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
              you
            </span>
          )}
        </div>
      </div>

      {/* Ready indicator */}
      {showReadyState && (
        <div className={clsx(
          "w-2 h-2 rounded-full flex-shrink-0",
          isReady ? "bg-neon-green shadow-[0_0_6px_#10b981]" : "bg-muted"
        )} />
      )}
    </motion.div>
  );
}
