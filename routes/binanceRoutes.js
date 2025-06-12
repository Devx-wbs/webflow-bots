const router = require("express").Router();
const {
  connectBinance,
  getBinanceStatus,
  disconnectBinance,
  getWalletInfo,
  getTradeHistory,
  getBinanceStats,
  getEnhancedWallet,
} = require("../controllers/binanceController");

router.post("/connect", connectBinance);
router.get("/status", getBinanceStatus);
router.post("/disconnect", disconnectBinance);
router.get("/wallet", getWalletInfo);
router.get("/trades", getTradeHistory);
router.get("/stats", getBinanceStats);
router.get("/enhanced-wallet", getEnhancedWallet);

module.exports = router;
