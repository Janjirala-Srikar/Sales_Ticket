const express = require("express");
const router = express.Router();
const { chat, startSession, clearChat } = require("../controllers/chatController");

router.post("/session/start", startSession);  // 👈 new
router.post("/", chat);
router.post("/clear", clearChat);

module.exports = router;