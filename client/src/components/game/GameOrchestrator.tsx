"use client";

import { useGameStore } from "@/store/gameStore";
import { AnimatePresence, motion } from "framer-motion";
import HomeScreen from "./HomeScreen";
import LobbyScreen from "./LobbyScreen";
import PlayingScreen from "./PlayingScreen";
import RevealScreen from "./RevealScreen";
import ResultsScreen from "./ResultsScreen";
import VotingScreen from "./VotingScreen";
import ChatVoiceOverlay from "./ChatVoiceOverlay";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export default function GameOrchestrator() {
  const { phase } = useGameStore();

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          {phase === "home" && <HomeScreen />}
          {phase === "lobby" && <LobbyScreen />}
          {phase === "playing" && <PlayingScreen />}
          {phase === "voting" && <VotingScreen />}
          {phase === "revealed" && <RevealScreen />}
          {phase === "results" && <ResultsScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Chat + Voice overlay — visible on all screens except home */}
      {phase !== "home" && <ChatVoiceOverlay />}
    </>
  );
}
