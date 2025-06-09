const router = require("express").Router();
const { createBot } = require("../controllers/botController");

router.post("/create", createBot);

module.exports = router;
