"use client";

import { useEffect, useCallback, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { connectSocket, getSocket, disconnectSocket } from "@/lib/socket";
import { playSound, resumeAudio } from "@/lib/sounds";
import toast from "react-hot-toast";
import { Room, Player, RoundData, RevealData } from "@/types";

export function useSocket() {
  const store = useGameStore();
  const listenersAttached = useRef(false);

  const attachListeners = useCallback(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    const socket = getSocket();

    // ─── Room Events ────────────────────────────────────────────────
    socket.on("room:playerJoined", ({ player, room }: { player: Player; room: Room }) => {
      store.setRoom(room);
      toast(`${player.avatar} ${player.nickname} joined!`, { icon: "👋" });
      playSound("join");
    });

    socket.on("room:playerLeft", ({ socketId, room, newHost }: { socketId: string; room: Room; newHost: string }) => {
      store.setRoom(room);
      const socket = getSocket();
      if (newHost === socket.id) {
        toast("You are now the host!", { icon: "👑" });
      }
    });

    socket.on("room:playerRejoined", ({ player, room }: { player: Player; room: Room }) => {
      store.setRoom(room);
      toast(`${player.avatar} ${player.nickname} reconnected`, { icon: "🔄" });
    });

    socket.on("room:settingsUpdated", ({ settings }: { settings: Room["settings"] }) => {
      store.updateRoom({ settings });
    });

    socket.on("room:stateChanged", ({ state, round, totalRounds, readyCount, playerCount }: any) => {
      store.updateRoom({ state, currentRound: round, totalRounds });
      store.setReadyCount(readyCount, playerCount);
      if (state === "voting") {
        store.setPhase("voting");
      }
    });

    socket.on("room:reaction", ({ nickname, emoji }: { playerId: string; nickname: string; emoji: string }) => {
      toast(`${nickname}: ${emoji}`, { duration: 2000 });
    });

    // ─── Game Events ────────────────────────────────────────────────
    socket.on("game:roundStarted", (data: RoundData) => {
      store.setRoundData(data);
      store.setRevealData(null);
      store.setReady(false);
      store.setReadyCount(0, data.playerCount);
      store.setPhase("playing");
      playSound("start");
    });

    socket.on("game:readyUpdate", ({ readyCount, playerCount }: { readyCount: number; playerCount: number; readyPlayers: string[] }) => {
      store.setReadyCount(readyCount, playerCount);
    });

    socket.on("game:revealed", (data: RevealData) => {
      store.setRevealData(data);
      if (data.scores) {
        store.updateRoom({ scores: data.scores });
      }
      store.setPhase("revealed");
      playSound("reveal");
    });

    socket.on("game:voteUpdate", ({ votedCount, playerCount }: { votedCount: number; playerCount: number }) => {
      store.setReadyCount(votedCount, playerCount);
    });

    socket.on("game:over", ({ scores, players, totalRounds }: any) => {
      store.updateRoom({ state: "results", scores });
      store.setPhase("results");
      playSound("gameOver");
    });

    socket.on("game:resetted", ({ room }: { room: Room }) => {
      store.setRoom(room);
      store.setRoundData(null);
      store.setRevealData(null);
      store.setReady(false);
      store.setReadyCount(0, 0);
      store.setPhase("lobby");
    });

    socket.on("game:aborted", ({ reason, room }: { reason: string; room: Room }) => {
      store.setRoom(room);
      store.setRoundData(null);
      store.setRevealData(null);
      store.setReady(false);
      store.setPhase("lobby");
      toast.error(`Game aborted: ${reason}`);
    });

    // ─── Connection Events ──────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      if (reason !== "io client disconnect") {
        toast.error("Connection lost. Reconnecting...", { id: "disconnect" });
      }
    });

    socket.on("connect", () => {
      toast.dismiss("disconnect");
      const savedRoom = store.room;
      const savedPlayer = store.currentPlayer;

      if (savedRoom && savedPlayer) {
        socket.emit("room:rejoin", {
          roomCode: savedRoom.code,
          playerId: savedPlayer.id,
        }, (res: any) => {
          if (res.success) {
            store.setRoom(res.room);
            store.setCurrentPlayer(res.player);
            toast.success("Reconnected!", { id: "reconnect" });
          }
        });
      }
    });

    socket.on("connect_error", () => {
      toast.error("Cannot connect to server", { id: "connect_error" });
    });
  }, []);

  const connect = useCallback(() => {
    resumeAudio();
    const socket = connectSocket();
    attachListeners();
    return socket;
  }, [attachListeners]);

  const createRoom = useCallback((nickname: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = connect();
      socket.emit("room:create", { nickname }, (res: any) => {
        if (res.success) {
          store.setRoom(res.room);
          store.setCurrentPlayer(res.player);
          store.setPhase("lobby");
        }
        resolve(res);
      });
    });
  }, [connect, store]);

  const joinRoom = useCallback((nickname: string, roomCode: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = connect();
      socket.emit("room:join", { nickname, roomCode }, (res: any) => {
        if (res.success) {
          store.setRoom(res.room);
          store.setCurrentPlayer(res.player);
          store.setPhase("lobby");
        }
        resolve(res);
      });
    });
  }, [connect, store]);

  const startGame = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const roomCode = store.room?.code;
      if (!roomCode) return resolve({ success: false, error: "No room" });
      socket.emit("game:start", { roomCode }, (res: any) => resolve(res));
    });
  }, [store.room?.code]);

  const markReady = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const roomCode = store.room?.code;
      if (!roomCode) return resolve({ success: false, error: "No room" });
      store.setReady(true);
      playSound("ready");
      socket.emit("game:playerReady", { roomCode }, (res: any) => resolve(res));
    });
  }, [store]);

  const revealImposter = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const roomCode = store.room?.code;
      if (!roomCode) return resolve({ success: false, error: "No room" });
      socket.emit("game:reveal", { roomCode }, (res: any) => resolve(res));
    });
  }, [store.room?.code]);

  const startVoting = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const roomCode = store.room?.code;
      if (!roomCode) return resolve({ success: false, error: "No room" });
      socket.emit("game:startVoting", { roomCode }, (res: any) => resolve(res));
    });
  }, [store.room?.code]);

  const submitVote = useCallback((votedForSocketId: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const roomCode = store.room?.code;
      if (!roomCode) return resolve({ success: false, error: "No room" });
      socket.emit("game:vote", { roomCode, votedForSocketId }, (res: any) => resolve(res));
    });
  }, [store.room?.code]);

  const resetGame = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const roomCode = store.room?.code;
      if (!roomCode) return resolve({ success: false, error: "No room" });
      socket.emit("game:reset", { roomCode }, (res: any) => resolve(res));
    });
  }, [store.room?.code]);

  const updateSettings = useCallback((settings: Partial<Room["settings"]>) => {
    const socket = getSocket();
    const roomCode = store.room?.code;
    if (!roomCode) return;
    socket.emit("room:updateSettings", { roomCode, settings });
    store.updateRoom({ settings: { ...store.room!.settings, ...settings } });
  }, [store]);

  const sendReaction = useCallback((emoji: string) => {
    const socket = getSocket();
    const roomCode = store.room?.code;
    if (!roomCode) return;
    socket.emit("room:reaction", { roomCode, emoji });
  }, [store.room?.code]);

  const leaveRoom = useCallback(() => {
    disconnectSocket();
    store.reset();
  }, [store]);

  const isHost = store.currentPlayer?.socketId === store.room?.host;

  return {
    createRoom,
    joinRoom,
    startGame,
    markReady,
    revealImposter,
    startVoting,
    submitVote,
    resetGame,
    updateSettings,
    sendReaction,
    leaveRoom,
    isHost,
    socketId: getSocket()?.id,
  };
}
