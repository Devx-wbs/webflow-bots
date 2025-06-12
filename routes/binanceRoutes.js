const express = require("express");
const router = express.Router();
const controller = require("../controllers/binanceController");

router.post("/connect", controller.connectBinance);
router.get("/status", controller.getBinanceStatus);
router.post("/disconnect", controller.disconnectBinance);
router.get("/wallet", controller.getFullWalletInfo);
router.get("/trades", controller.getTradeHistory);
router.get("/stats", controller.getBinanceStats);

module.exports = router;
