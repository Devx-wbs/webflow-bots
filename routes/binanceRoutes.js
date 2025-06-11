const router = require("express").Router();
const {
  connectBinance,
  getBinanceStatus,
  disconnectBinance,
  getWalletInfo,
  getTradeHistory,
} = require("../controllers/binanceController");

router.post("/connect", connectBinance);
router.get("/status", getBinanceStatus);
router.post("/disconnect", disconnectBinance);
router.get("/wallet", getWalletInfo);
router.get("/trades", getTradeHistory);

module.exports = router;
