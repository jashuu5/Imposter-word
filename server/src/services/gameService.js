const WORD_PAIRS = require("../utils/wordPairs");

const AVATARS = [
  "🦊", "🐺", "🦁", "🐯", "🐻", "🦝", "🐸", "🦋",
  "🐙", "🦀", "🦑", "🐬", "🦅", "🦚", "🦜", "🐲",
];

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#82E0AA", "#F1948A",
];

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomAvatar(usedAvatars = []) {
  const available = AVATARS.filter((a) => !usedAvatars.includes(a));
  const pool = available.length > 0 ? available : AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomColor(usedColors = []) {
  const available = COLORS.filter((c) => !usedColors.includes(c));
  const pool = available.length > 0 ? available : COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateRoundData(players, settings, roundNumber) {
  const pairIndex = Math.floor(Math.random() * WORD_PAIRS.length);
  const [normalWord, imposterWord, category] = WORD_PAIRS[pairIndex];

  // Pick a random imposter
  const imposterIndex = Math.floor(Math.random() * players.length);
  const imposterId = players[imposterIndex].socketId;

  const playerWords = {};

  players.forEach((player) => {
    if (player.socketId === imposterId) {
      if (settings.gameMode === "classic") {
        playerWords[player.socketId] = {
          word: "❓ You are the Imposter",
          isImposter: true,
          category,
        };
      } else {
        playerWords[player.socketId] = {
          word: imposterWord,
          isImposter: settings.showImposterRole,
          category,
        };
      }
    } else {
      playerWords[player.socketId] = {
        word: normalWord,
        isImposter: false,
        category,
      };
    }
  });

  return {
    round: roundNumber,
    category,
    normalWord,
    imposterWord,
    imposterId,
    playerWords,
    gameMode: settings.gameMode,
  };
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    host: room.host,
    state: room.state,
    currentRound: room.currentRound,
    totalRounds: room.settings.totalRounds,
    settings: room.settings,
    players: room.players.map((p) => ({
      id: p.id,
      socketId: p.socketId,
      nickname: p.nickname,
      avatar: p.avatar,
      color: p.color,
      isHost: p.socketId === room.host,
      isReady: room.readyPlayers ? room.readyPlayers.has(p.socketId) : false,
    })),
    readyCount: room.readyPlayers ? room.readyPlayers.size : 0,
    scores: room.scores || {},
  };
}

module.exports = {
  generateRoomCode,
  generatePlayerId,
  getRandomAvatar,
  getRandomColor,
  generateRoundData,
  sanitizeRoom,
};
