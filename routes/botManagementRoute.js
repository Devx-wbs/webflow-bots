const express = require("express");
const router = express.Router();

const {
  listBots,
  activateBot,
  stopBot,
} = require("../controllers/botManagementController");

// GET /api/bots/manage/list?userId=<your-userId>
router.get("/list", listBots);

// POST /api/bots/manage/:botId/activate
router.post("/:botId/activate", activateBot);

// POST /api/bots/manage/:botId/stop
router.post("/:botId/stop", stopBot);

module.exports = router;
