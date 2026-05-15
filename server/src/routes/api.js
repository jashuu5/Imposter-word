const express = require("express");
const router = express.Router();
const store = require("../services/store");
const { sanitizeRoom } = require("../services/gameService");

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get room info (public safe info only)
router.get("/rooms/:code", (req, res) => {
  const room = store.getRoom(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ room: sanitizeRoom(room) });
});

// Check if room exists
router.get("/rooms/:code/exists", (req, res) => {
  const room = store.getRoom(req.params.code.toUpperCase());
  res.json({
    exists: !!room,
    joinable: room ? room.state === "lobby" : false,
    playerCount: room ? room.players.length : 0,
  });
});

module.exports = router;
