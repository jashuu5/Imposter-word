import { io, Socket } from "socket.io-client";

// Since server now serves both client and API on port 3001,
// we always connect to port 3001 regardless of where the page loaded from.
function getServerURL(): string {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL;
  }
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3001";
    }
  }
  return "http://localhost:3001";
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const SERVER_URL = getServerURL();
    const isNgrok = SERVER_URL.includes("ngrok");
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      extraHeaders: isNgrok
        ? { "ngrok-skip-browser-warning": "true" }
        : undefined,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function resetSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
