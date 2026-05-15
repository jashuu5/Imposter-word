"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { getSocket } from "@/lib/socket";
import clsx from "clsx";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderColor: string;
  text: string;
  timestamp: number;
}

// ─── WebRTC Voice Chat ────────────────────────────────────────────────────────
const peers: Record<string, RTCPeerConnection> = {};
let localStream: MediaStream | null = null;

function createPeer(targetId: string, isInitiator: boolean, stream: MediaStream) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      getSocket().emit("voice:ice", { targetId, candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    const audio = document.getElementById(`audio-${targetId}`) as HTMLAudioElement | null;
    if (audio) {
      audio.srcObject = e.streams[0];
    } else {
      const el = document.createElement("audio");
      el.id = `audio-${targetId}`;
      el.autoplay = true;
      (el as any).playsInline = true;
      document.body.appendChild(el);
      el.srcObject = e.streams[0];
    }
  };

  if (isInitiator) {
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        getSocket().emit("voice:offer", { targetId, sdp: pc.localDescription });
      });
  }

  peers[targetId] = pc;
  return pc;
}

function cleanupPeer(targetId: string) {
  const audio = document.getElementById(`audio-${targetId}`);
  if (audio) audio.remove();
  if (peers[targetId]) {
    peers[targetId].close();
    delete peers[targetId];
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatVoiceOverlay() {
  const { room, currentPlayer } = useGameStore();

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice state
  const [micEnabled, setMicEnabled] = useState(false);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const socket = getSocket();
  const roomCode = room?.code;

  // ─── Chat: socket events ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnread((u) => u + 1);
    };

    socket.on("chat:message", handleMessage);
    return () => { socket.off("chat:message", handleMessage); };
  }, [socket, chatOpen]);

  // Reset unread when chat opens
  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!inputText.trim() || !roomCode || !currentPlayer) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      senderId: currentPlayer.socketId,
      senderName: currentPlayer.nickname,
      senderAvatar: currentPlayer.avatar,
      senderColor: currentPlayer.color,
      text: inputText.trim(),
      timestamp: Date.now(),
    };
    socket.emit("chat:message", { roomCode, message: msg });
    setMessages((prev) => [...prev, msg]);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Voice: mic + WebRTC ─────────────────────────────────────────────────
  const startSpeakingDetection = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const check = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setIsSpeaking(avg > 20);
      animFrameRef.current = requestAnimationFrame(check);
    };
    check();
  }, []);

  const enableMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream = stream;
      setMicPermission("granted");
      setMicEnabled(true);
      startSpeakingDetection(stream);

      // Notify others we joined voice
      socket.emit("voice:join", { roomCode });

      // Signal existing voice peers
      socket.emit("voice:requestPeers", { roomCode });
    } catch {
      setMicPermission("denied");
    }
  }, [roomCode, socket, startSpeakingDetection]);

  const disableMic = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setMicEnabled(false);
    setIsSpeaking(false);
    socket.emit("voice:leave", { roomCode });

    // Close all peer connections
    Object.keys(peers).forEach(cleanupPeer);
  }, [roomCode, socket]);

  const toggleMic = useCallback(() => {
    if (micEnabled) {
      disableMic();
    } else {
      enableMic();
    }
  }, [micEnabled, enableMic, disableMic]);

  // ─── Voice: WebRTC signaling events ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Someone joined voice — initiate a connection to them
    const onPeerJoined = ({ peerId }: { peerId: string }) => {
      if (!localStream || peerId === socket.id) return;
      createPeer(peerId, true, localStream);
    };

    // We just joined — here are existing peers
    const onExistingPeers = ({ peerIds }: { peerIds: string[] }) => {
      if (!localStream) return;
      peerIds.forEach((id) => {
        if (id !== socket.id && !peers[id]) {
          createPeer(id, true, localStream!);
        }
      });
    };

    const onOffer = async ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
      if (!localStream) return;
      const pc = createPeer(fromId, false, localStream);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", { targetId: fromId, sdp: pc.localDescription });
    };

    const onAnswer = async ({ fromId, sdp }: { fromId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peers[fromId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const onIce = async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peers[fromId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const onPeerLeft = ({ peerId }: { peerId: string }) => {
      cleanupPeer(peerId);
      setSpeakingPeers((prev) => { const s = new Set(prev); s.delete(peerId); return s; });
    };

    const onSpeaking = ({ peerId, speaking }: { peerId: string; speaking: boolean }) => {
      setSpeakingPeers((prev) => {
        const s = new Set(prev);
        speaking ? s.add(peerId) : s.delete(peerId);
        return s;
      });
    };

    socket.on("voice:peerJoined", onPeerJoined);
    socket.on("voice:existingPeers", onExistingPeers);
    socket.on("voice:offer", onOffer);
    socket.on("voice:answer", onAnswer);
    socket.on("voice:ice", onIce);
    socket.on("voice:peerLeft", onPeerLeft);
    socket.on("voice:speaking", onSpeaking);

    return () => {
      socket.off("voice:peerJoined", onPeerJoined);
      socket.off("voice:existingPeers", onExistingPeers);
      socket.off("voice:offer", onOffer);
      socket.off("voice:answer", onAnswer);
      socket.off("voice:ice", onIce);
      socket.off("voice:peerLeft", onPeerLeft);
      socket.off("voice:speaking", onSpeaking);
    };
  }, [socket]);

  // Emit speaking status
  useEffect(() => {
    if (!micEnabled || !roomCode) return;
    socket.emit("voice:speaking", { roomCode, speaking: isSpeaking });
  }, [isSpeaking, micEnabled, roomCode, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableMic();
    };
  }, []);

  if (!room || !currentPlayer) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating buttons — top right */}
      {!chatOpen && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {/* Chat button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChatOpen((o) => !o)}
            className="relative w-10 h-10 rounded-xl bg-surface border border-border hover:border-accent/50 flex items-center justify-center transition-colors"
            title="Chat"
          >
            <span className="text-lg">💬</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </motion.button>

          {/* Mic button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMic}
            className={clsx(
              "relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200",
              micEnabled
                ? isSpeaking
                  ? "bg-neon-green/20 border-neon-green shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-accent/20 border-accent"
                : "bg-surface border-border hover:border-subtle"
            )}
            title={micEnabled ? "Mute mic" : "Enable voice chat"}
          >
            <span className="text-lg">{micEnabled ? (isSpeaking ? "🎙️" : "🔊") : "🎤"}</span>
            {micPermission === "denied" && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-red rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                !
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 z-30 bg-black/20"
            />
            <motion.div
              key="chat-panel"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 80 || info.velocity.x > 500) {
                  setChatOpen(false);
                }
              }}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] z-40 flex flex-col"
              style={{
                background: "rgba(10, 10, 18, 0.97)",
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
              }}
            >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <span className="font-display font-bold text-white text-sm">Room Chat</span>
                <span className="text-faint text-xs font-mono">#{room.code}</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-lg bg-surface border border-border hover:border-neon-red/50 hover:text-neon-red flex items-center justify-center text-faint transition-colors text-sm font-bold"
                title="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Voice status bar */}
            {micEnabled && (
              <div className={clsx(
                "px-4 py-2 text-xs font-mono flex items-center gap-2 border-b border-border/30",
                isSpeaking ? "bg-neon-green/10 text-neon-green" : "bg-accent/5 text-accent-light"
              )}>
                <span className={clsx("w-1.5 h-1.5 rounded-full", isSpeaking ? "bg-neon-green animate-pulse" : "bg-accent")} />
                {isSpeaking ? "Speaking..." : "🎙️ Voice active — listening"}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="text-center text-faint text-xs mt-8">
                  <p className="text-2xl mb-2">💬</p>
                  <p>No messages yet</p>
                  <p className="mt-1">Say something to your team!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentPlayer.socketId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "tween", duration: 0.1 }}
                    className={clsx("flex gap-2", isMe && "flex-row-reverse")}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${msg.senderColor}20`, border: `1px solid ${msg.senderColor}40` }}
                    >
                      {msg.senderAvatar}
                    </div>

                    {/* Bubble */}
                    <div className={clsx("max-w-[75%]", isMe && "items-end flex flex-col")}>
                      {!isMe && (
                        <p className="text-faint text-[10px] font-mono mb-0.5 pl-1">{msg.senderName}</p>
                      )}
                      <div
                        className={clsx(
                          "px-3 py-2 rounded-xl text-sm leading-snug break-words",
                          isMe
                            ? "bg-accent text-white rounded-tr-sm"
                            : "bg-surface border border-border text-dim rounded-tl-sm"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border/50">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message your team..."
                  maxLength={200}
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-faint outline-none focus:border-accent/50 transition-colors"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className="w-9 h-9 rounded-xl bg-accent disabled:opacity-30 flex items-center justify-center text-white transition-opacity"
                >
                  ➤
                </motion.button>
              </div>
              <p className="text-faint text-[10px] font-mono mt-1.5 text-right">
                {inputText.length}/200 · Enter to send
              </p>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mic permission denied toast-style hint */}
      <AnimatePresence>
        {micPermission === "denied" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-4 z-50 bg-neon-red/10 border border-neon-red/30 text-neon-red text-xs px-4 py-2 rounded-xl font-mono max-w-[220px]"
          >
            🎤 Mic access denied. Allow it in your browser settings.
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
