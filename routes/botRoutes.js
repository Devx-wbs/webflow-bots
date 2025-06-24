const express = require("express");
const router = express.Router();
const { createBot } = require("../controllers/botController");

// POST /api/bots/create
router.post("/create", createBot);

module.exports = router;
