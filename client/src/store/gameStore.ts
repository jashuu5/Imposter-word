import { create } from "zustand";
import { GameState, Player, Room, RoundData, RevealData } from "@/types";

interface GameStore extends GameState {
  setPhase: (phase: GameState["phase"]) => void;
  setRoom: (room: Room | null) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setRoundData: (data: RoundData | null) => void;
  setRevealData: (data: RevealData | null) => void;
  setReady: (ready: boolean) => void;
  setReadyCount: (count: number, playerCount: number) => void;
  updateRoom: (updates: Partial<Room>) => void;
  reset: () => void;
}

const initialState: GameState = {
  phase: "home",
  room: null,
  currentPlayer: null,
  roundData: null,
  revealData: null,
  isReady: false,
  readyCount: 0,
  playerCount: 0,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setRoom: (room) => set({ room }),
  setCurrentPlayer: (currentPlayer) => set({ currentPlayer }),
  setRoundData: (roundData) => set({ roundData }),
  setRevealData: (revealData) => set({ revealData }),
  setReady: (isReady) => set({ isReady }),
  setReadyCount: (readyCount, playerCount) => set({ readyCount, playerCount }),

  updateRoom: (updates) =>
    set((state) => ({
      room: state.room ? { ...state.room, ...updates } : null,
    })),

  reset: () => set({ ...initialState }),
}));
