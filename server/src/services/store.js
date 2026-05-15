/**
 * In-memory store for rooms and players.
 * Architected for easy swap to MongoDB/Redis.
 */

const rooms = new Map();
const playerSocketMap = new Map(); // socketId -> roomCode

const store = {
  // Room operations
  createRoom(roomCode, hostData) {
    const room = {
      code: roomCode,
      host: hostData.socketId,
      players: [hostData],
      state: "lobby", // lobby | playing | results
      currentRound: 0,
      totalRounds: 5,
      settings: {
        totalRounds: 5,
        gameMode: "related", // 'related' | 'classic'
        showImposterRole: true,
        timerDuration: 0,
        autoAdvance: false,
      },
      roundData: null,
      readyPlayers: new Set(),
      votes: new Map(), // socketId -> votedForSocketId
      scores: {},
      createdAt: Date.now(),
    };
    rooms.set(roomCode, room);
    playerSocketMap.set(hostData.socketId, roomCode);
    return room;
  },

  getRoom(roomCode) {
    return rooms.get(roomCode) || null;
  },

  deleteRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      room.players.forEach((p) => playerSocketMap.delete(p.socketId));
    }
    rooms.delete(roomCode);
  },

  addPlayer(roomCode, playerData) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.players.push(playerData);
    playerSocketMap.set(playerData.socketId, roomCode);
    return room;
  },

  removePlayer(socketId) {
    const roomCode = playerSocketMap.get(socketId);
    if (!roomCode) return null;
    const room = rooms.get(roomCode);
    if (!room) return null;

    room.players = room.players.filter((p) => p.socketId !== socketId);
    room.readyPlayers.delete(socketId);
    playerSocketMap.delete(socketId);

    // If room is empty, delete it
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      return { room: null, roomCode };
    }

    // If host left, transfer host
    if (room.host === socketId && room.players.length > 0) {
      room.host = room.players[0].socketId;
    }

    return { room, roomCode };
  },

  updatePlayerSocket(oldSocketId, newSocketId, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.socketId === oldSocketId);
    if (player) {
      player.socketId = newSocketId;
      if (room.host === oldSocketId) room.host = newSocketId;
      playerSocketMap.delete(oldSocketId);
      playerSocketMap.set(newSocketId, roomCode);
    }
    return room;
  },

  updateSettings(roomCode, settings) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.settings = { ...room.settings, ...settings };
    return room;
  },

  setRoundData(roomCode, roundData) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.roundData = roundData;
    room.readyPlayers = new Set();
    room.votes = new Map();
    room.state = "playing";
    return room;
  },

  markPlayerReady(roomCode, socketId) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.readyPlayers.add(socketId);
    return room;
  },

  submitVote(roomCode, socketId, votedForSocketId) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.votes.set(socketId, votedForSocketId);
    return room;
  },

  allPlayersReady(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return false;
    return room.players.every((p) => room.readyPlayers.has(p.socketId));
  },

  getRoomBySocket(socketId) {
    const roomCode = playerSocketMap.get(socketId);
    return roomCode ? rooms.get(roomCode) : null;
  },

  getRoomCodeBySocket(socketId) {
    return playerSocketMap.get(socketId) || null;
  },

  incrementRound(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.currentRound += 1;
    return room;
  },

  updateScore(roomCode, playerId, delta) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.scores[playerId] = (room.scores[playerId] || 0) + delta;
    return room;
  },

  setState(roomCode, state) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    room.state = state;
    return room;
  },
};

module.exports = store;
