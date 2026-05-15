require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes/api");
const setupSocketHandlers = require("./socket/socketHandlers");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// ─── CORS ──────────────────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET", "POST"], credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

// ─── SOCKET.IO ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── API ROUTES ────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ─── SERVE CLIENT ─────────────────────────────────────────────────
// Use absolute path so it works on Windows and Mac
const outPath = path.resolve(__dirname, "..", "..", "client", "out");
console.log("Serving client from:", outPath);

app.use(express.static(outPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return;
  res.sendFile(path.join(outPath, "index.html"));
});

// ─── SOCKET HANDLERS ───────────────────────────────────────────────
setupSocketHandlers(io);

// ─── START — bind on 0.0.0.0 so both localhost and 127.0.0.1 work ──
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🎮 Imposter Word — All-in-one server`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🏠 Local:  http://localhost:${PORT}`);
  console.log(`🌐 ngrok:  https://facecloth-exhume-pang.ngrok-free.dev\n`);
});

module.exports = { app, server, io };
