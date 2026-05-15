export interface Player {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomSettings {
  totalRounds: number;
  gameMode: "related" | "classic";
  showImposterRole: boolean;
  timerDuration: number;
  autoAdvance: boolean;
}

export interface Room {
  code: string;
  host: string;
  state: "lobby" | "playing" | "results";
  currentRound: number;
  totalRounds: number;
  settings: RoomSettings;
  players: Player[];
  readyCount: number;
  scores: Record<string, number>;
}

export interface RoundData {
  round: number;
  totalRounds: number;
  category: string;
  yourWord: string;
  isImposter: boolean;
  playerCount: number;
}

export interface RevealData {
  imposterSocketId: string;
  imposterNickname: string;
  normalWord: string;
  imposterWord: string;
  category: string;
  votes?: Record<string, string>;
  imposterCaught?: boolean;
  correctVoters?: string[];
  scores?: Record<string, number>;
}

export interface GameState {
  phase: "home" | "lobby" | "playing" | "voting" | "revealed" | "results";
  room: Room | null;
  currentPlayer: Player | null;
  roundData: RoundData | null;
  revealData: RevealData | null;
  isReady: boolean;
  readyCount: number;
  playerCount: number;
}
