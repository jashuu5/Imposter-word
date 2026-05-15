const store = require("../services/store");
const {
  generateRoomCode,
  generatePlayerId,
  getRandomAvatar,
  getRandomColor,
  generateRoundData,
  sanitizeRoom,
} = require("../services/gameService");

module.exports = function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── CREATE ROOM ───────────────────────────────────────────────
    socket.on("room:create", ({ nickname }, callback) => {
      try {
        let roomCode;
        let attempts = 0;
        do {
          roomCode = generateRoomCode();
          attempts++;
        } while (store.getRoom(roomCode) && attempts < 10);

        const usedAvatars = [];
        const usedColors = [];
        const avatar = getRandomAvatar(usedAvatars);
        const color = getRandomColor(usedColors);

        const hostData = {
          id: generatePlayerId(),
          socketId: socket.id,
          nickname: nickname.trim().slice(0, 20),
          avatar,
          color,
          joinedAt: Date.now(),
        };

        const room = store.createRoom(roomCode, hostData);
        socket.join(roomCode);

        callback({
          success: true,
          room: sanitizeRoom(room),
          player: hostData,
        });

        console.log(`[Room] Created: ${roomCode} by ${nickname}`);
      } catch (err) {
        console.error("[room:create]", err);
        callback({ success: false, error: "Failed to create room" });
      }
    });

    // ─── JOIN ROOM ─────────────────────────────────────────────────
    socket.on("room:join", ({ nickname, roomCode }, callback) => {
      try {
        const code = roomCode.trim().toUpperCase();
        const room = store.getRoom(code);

        if (!room) {
          return callback({ success: false, error: "Room not found" });
        }
        if (room.state !== "lobby") {
          return callback({ success: false, error: "Game already in progress" });
        }
        if (room.players.length >= 12) {
          return callback({ success: false, error: "Room is full (max 12 players)" });
        }

        const usedAvatars = room.players.map((p) => p.avatar);
        const usedColors = room.players.map((p) => p.color);

        const playerData = {
          id: generatePlayerId(),
          socketId: socket.id,
          nickname: nickname.trim().slice(0, 20),
          avatar: getRandomAvatar(usedAvatars),
          color: getRandomColor(usedColors),
          joinedAt: Date.now(),
        };

        const updatedRoom = store.addPlayer(code, playerData);
        socket.join(code);

        // Notify existing players
        socket.to(code).emit("room:playerJoined", {
          player: playerData,
          room: sanitizeRoom(updatedRoom),
        });

        callback({
          success: true,
          room: sanitizeRoom(updatedRoom),
          player: playerData,
        });

        console.log(`[Room] ${nickname} joined ${code}`);
      } catch (err) {
        console.error("[room:join]", err);
        callback({ success: false, error: "Failed to join room" });
      }
    });

    // ─── REJOIN ROOM ───────────────────────────────────────────────
    socket.on("room:rejoin", ({ roomCode, playerId }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback({ success: false, error: "Room not found" });

        const player = room.players.find((p) => p.id === playerId);
        if (!player) return callback({ success: false, error: "Player not found" });

        const oldSocketId = player.socketId;
        store.updatePlayerSocket(oldSocketId, socket.id, roomCode);
        socket.join(roomCode);

        const updatedRoom = store.getRoom(roomCode);
        socket.to(roomCode).emit("room:playerRejoined", {
          player: { ...player, socketId: socket.id },
          room: sanitizeRoom(updatedRoom),
        });

        callback({ success: true, room: sanitizeRoom(updatedRoom), player: { ...player, socketId: socket.id } });
      } catch (err) {
        console.error("[room:rejoin]", err);
        callback({ success: false, error: "Failed to rejoin" });
      }
    });

    // ─── UPDATE SETTINGS ───────────────────────────────────────────
    socket.on("room:updateSettings", ({ roomCode, settings }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });
        if (room.host !== socket.id) return callback?.({ success: false, error: "Not host" });

        const updated = store.updateSettings(roomCode, settings);
        io.to(roomCode).emit("room:settingsUpdated", { settings: updated.settings });
        callback?.({ success: true });
      } catch (err) {
        console.error("[room:updateSettings]", err);
        callback?.({ success: false, error: "Failed to update settings" });
      }
    });

    // ─── START GAME ────────────────────────────────────────────────
    socket.on("game:start", ({ roomCode }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });
        if (room.host !== socket.id) return callback?.({ success: false, error: "Not host" });
        if (room.players.length < 2) return callback?.({ success: false, error: "Need at least 2 players" });

        const updatedRoom = store.incrementRound(roomCode);
        const roundData = generateRoundData(
          updatedRoom.players,
          updatedRoom.settings,
          updatedRoom.currentRound
        );
        store.setRoundData(roomCode, roundData);

        // Send each player their own word only
        updatedRoom.players.forEach((player) => {
          const playerWord = roundData.playerWords[player.socketId];
          io.to(player.socketId).emit("game:roundStarted", {
            round: roundData.round,
            totalRounds: updatedRoom.settings.totalRounds,
            category: roundData.category,
            yourWord: playerWord.word,
            isImposter: playerWord.isImposter,
            playerCount: updatedRoom.players.length,
          });
        });

        // Send room state update to all
        io.to(roomCode).emit("room:stateChanged", {
          state: "playing",
          round: updatedRoom.currentRound,
          totalRounds: updatedRoom.settings.totalRounds,
          readyCount: 0,
          playerCount: updatedRoom.players.length,
        });

        callback?.({ success: true });
        console.log(`[Game] Started in room ${roomCode}, round ${updatedRoom.currentRound}`);
      } catch (err) {
        console.error("[game:start]", err);
        callback?.({ success: false, error: "Failed to start game" });
      }
    });

    // ─── PLAYER READY (NEXT ROUND) ─────────────────────────────────
    socket.on("game:playerReady", ({ roomCode }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });

        store.markPlayerReady(roomCode, socket.id);
        const updatedRoom = store.getRoom(roomCode);
        const readyCount = updatedRoom.readyPlayers.size;
        const playerCount = updatedRoom.players.length;

        // Broadcast ready status to all
        io.to(roomCode).emit("game:readyUpdate", {
          readyCount,
          playerCount,
          readyPlayers: Array.from(updatedRoom.readyPlayers),
        });

        callback?.({ success: true, readyCount, playerCount });

        // Check if all players are ready
        if (store.allPlayersReady(roomCode)) {
          const currentRoom = store.getRoom(roomCode);

          if (currentRoom.currentRound >= currentRoom.settings.totalRounds) {
            // Game over
            store.setState(roomCode, "results");
            io.to(roomCode).emit("game:over", {
              scores: currentRoom.scores,
              players: sanitizeRoom(currentRoom).players,
              totalRounds: currentRoom.settings.totalRounds,
            });
          } else {
            // Next round
            const nextRoom = store.incrementRound(roomCode);
            const roundData = generateRoundData(
              nextRoom.players,
              nextRoom.settings,
              nextRoom.currentRound
            );
            store.setRoundData(roomCode, roundData);

            nextRoom.players.forEach((player) => {
              const playerWord = roundData.playerWords[player.socketId];
              io.to(player.socketId).emit("game:roundStarted", {
                round: roundData.round,
                totalRounds: nextRoom.settings.totalRounds,
                category: roundData.category,
                yourWord: playerWord.word,
                isImposter: playerWord.isImposter,
                playerCount: nextRoom.players.length,
              });
            });

            io.to(roomCode).emit("room:stateChanged", {
              state: "playing",
              round: nextRoom.currentRound,
              totalRounds: nextRoom.settings.totalRounds,
              readyCount: 0,
              playerCount: nextRoom.players.length,
            });
          }
        }
      } catch (err) {
        console.error("[game:playerReady]", err);
        callback?.({ success: false, error: "Failed to mark ready" });
      }
    });

    // ─── VOTING ───────────────────────────────────────────────────
    socket.on("game:vote", ({ roomCode, votedForSocketId }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });

        store.submitVote(roomCode, socket.id, votedForSocketId);
        
        io.to(roomCode).emit("game:voteUpdate", {
          votedCount: room.votes.size,
          playerCount: room.players.length,
        });

        callback?.({ success: true });

        // Auto-end voting if everyone voted
        if (room.votes.size === room.players.length) {
           handleEndVoting(roomCode);
        }
      } catch (err) {
        console.error("[game:vote]", err);
        callback?.({ success: false, error: "Failed to submit vote" });
      }
    });

    socket.on("game:endVoting", ({ roomCode }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });
        if (room.host !== socket.id) return callback?.({ success: false, error: "Not host" });

        handleEndVoting(roomCode);
        callback?.({ success: true });
      } catch (err) {
        console.error("[game:endVoting]", err);
        callback?.({ success: false, error: "Failed to end voting" });
      }
    });

    function handleEndVoting(roomCode) {
      const room = store.getRoom(roomCode);
      if (!room || !room.roundData) return;

      const imposterId = room.roundData.imposterId;
      const votes = Object.fromEntries(room.votes);
      
      // Tally votes
      const voteCounts = {};
      room.votes.forEach(votedId => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      });

      // Find player with max votes
      let maxVotes = 0;
      let mostVotedPlayers = [];
      for (const [id, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          mostVotedPlayers = [id];
        } else if (count === maxVotes) {
          mostVotedPlayers.push(id);
        }
      }

      // Imposter caught if they are the ONLY one with max votes
      const imposterCaught = mostVotedPlayers.length === 1 && mostVotedPlayers[0] === imposterId;

      // Update scores — only the player(s) who voted FOR the imposter get +1
      if (imposterCaught) {
        room.votes.forEach((votedForId, voterId) => {
          if (votedForId === imposterId) {
            store.updateScore(roomCode, voterId, 1);
          }
        });
      } else {
        // Imposter escaped — only the imposter gets +1
        store.updateScore(roomCode, imposterId, 1);
      }

      const imposter = room.players.find(
        (p) => p.socketId === room.roundData.imposterId
      );

      // Collect which socket IDs voted correctly (voted for the imposter)
      const correctVoters = [];
      room.votes.forEach((votedForId, voterId) => {
        if (votedForId === imposterId) correctVoters.push(voterId);
      });

      store.setState(roomCode, "revealed");

      io.to(roomCode).emit("game:revealed", {
        imposterSocketId: room.roundData.imposterId,
        imposterNickname: imposter?.nickname || "Unknown",
        normalWord: room.roundData.normalWord,
        imposterWord: room.roundData.imposterWord,
        category: room.roundData.category,
        votes: votes,
        imposterCaught,
        correctVoters,
        scores: room.scores
      });
    }

    // ─── START VOTING PHASE (host triggered) ──────────────────────
    socket.on("game:startVoting", ({ roomCode }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });
        if (room.host !== socket.id) return callback?.({ success: false, error: "Not host" });
        if (!room.roundData) return callback?.({ success: false, error: "No active round" });

        store.setState(roomCode, "voting");
        room.votes = new Map(); // Reset votes
        
        io.to(roomCode).emit("room:stateChanged", {
           state: "voting",
           round: room.currentRound,
           totalRounds: room.settings.totalRounds,
           readyCount: 0,
           playerCount: room.players.length,
        });

        callback?.({ success: true });
      } catch(err) {
        console.error("[game:startVoting]", err);
        callback?.({ success: false, error: "Failed to start voting" });
      }
    });

    // ─── REVEAL (host reveals imposter) ───────────────────────────
    socket.on("game:reveal", ({ roomCode }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });
        if (room.host !== socket.id) return callback?.({ success: false, error: "Not host" });
        if (!room.roundData) return callback?.({ success: false, error: "No active round" });

        const imposter = room.players.find(
          (p) => p.socketId === room.roundData.imposterId
        );

        io.to(roomCode).emit("game:revealed", {
          imposterSocketId: room.roundData.imposterId,
          imposterNickname: imposter?.nickname || "Unknown",
          normalWord: room.roundData.normalWord,
          imposterWord: room.roundData.imposterWord,
          category: room.roundData.category,
        });

        // Not used now since we transition to reveal through voting end
        callback?.({ success: true });
      } catch (err) {
        console.error("[game:reveal]", err);
        callback?.({ success: false, error: "Failed to reveal" });
      }
    });

    // ─── RESET GAME ────────────────────────────────────────────────
    socket.on("game:reset", ({ roomCode }, callback) => {
      try {
        const room = store.getRoom(roomCode);
        if (!room) return callback?.({ success: false, error: "Room not found" });
        if (room.host !== socket.id) return callback?.({ success: false, error: "Not host" });

        room.state = "lobby";
        room.currentRound = 0;
        room.roundData = null;
        room.readyPlayers = new Set();
        room.scores = {};

        io.to(roomCode).emit("game:resetted", { room: sanitizeRoom(room) });
        callback?.({ success: true });
      } catch (err) {
        console.error("[game:reset]", err);
        callback?.({ success: false, error: "Failed to reset" });
      }
    });

    // ─── CHAT ──────────────────────────────────────────────────────
    socket.on("chat:message", ({ roomCode, message }) => {
      const room = store.getRoom(roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      // Broadcast to everyone else in the room (sender already added locally)
      socket.to(roomCode).emit("chat:message", message);
    });

    // ─── VOICE SIGNALING ───────────────────────────────────────────
    const voiceRooms = new Map(); // roomCode -> Set of socketIds in voice

    socket.on("voice:join", ({ roomCode }) => {
      if (!voiceRooms.has(roomCode)) voiceRooms.set(roomCode, new Set());
      voiceRooms.get(roomCode).add(socket.id);
      socket.to(roomCode).emit("voice:peerJoined", { peerId: socket.id });
    });

    socket.on("voice:requestPeers", ({ roomCode }) => {
      const peers = voiceRooms.get(roomCode);
      if (!peers) return;
      const peerIds = [...peers].filter((id) => id !== socket.id);
      socket.emit("voice:existingPeers", { peerIds });
    });

    socket.on("voice:leave", ({ roomCode }) => {
      const peers = voiceRooms.get(roomCode);
      if (peers) {
        peers.delete(socket.id);
        if (peers.size === 0) voiceRooms.delete(roomCode);
      }
      socket.to(roomCode).emit("voice:peerLeft", { peerId: socket.id });
    });

    socket.on("voice:offer", ({ targetId, sdp }) => {
      socket.to(targetId).emit("voice:offer", { fromId: socket.id, sdp });
    });

    socket.on("voice:answer", ({ targetId, sdp }) => {
      socket.to(targetId).emit("voice:answer", { fromId: socket.id, sdp });
    });

    socket.on("voice:ice", ({ targetId, candidate }) => {
      socket.to(targetId).emit("voice:ice", { fromId: socket.id, candidate });
    });

    socket.on("voice:speaking", ({ roomCode, speaking }) => {
      socket.to(roomCode).emit("voice:speaking", { peerId: socket.id, speaking });
    });

    // ─── CHAT / REACTIONS ──────────────────────────────────────────
    socket.on("room:reaction", ({ roomCode, emoji }) => {
      const room = store.getRoom(roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      socket.to(roomCode).emit("room:reaction", {
        playerId: player.id,
        nickname: player.nickname,
        emoji,
      });
    });

    // ─── DISCONNECT ────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const result = store.removePlayer(socket.id);
      if (!result) return;

      const { room, roomCode } = result;
      if (!room) {
        console.log(`[Room] Deleted empty room: ${roomCode}`);
        return;
      }

      io.to(roomCode).emit("room:playerLeft", {
        socketId: socket.id,
        room: sanitizeRoom(room),
        newHost: room.host,
      });

      // If game was in progress and not enough players
      if (room.state === "playing" && room.players.length < 2) {
        store.setState(roomCode, "lobby");
        room.currentRound = 0;
        room.roundData = null;
        room.readyPlayers = new Set();
        io.to(roomCode).emit("game:aborted", {
          reason: "Not enough players",
          room: sanitizeRoom(store.getRoom(roomCode)),
        });
      }
    });
  });
};
