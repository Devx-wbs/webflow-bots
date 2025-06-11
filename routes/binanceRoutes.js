const router = require("express").Router();
const {
  connectBinance,
  getBinanceStatus,
  disconnectBinance,
  getWalletInfo,
} = require("../controllers/binanceController");

router.post("/connect", connectBinance);
router.get("/status", getBinanceStatus);
router.post("/disconnect", disconnectBinance);
router.get("/binance/wallet", getWalletInfo);

module.exports = router;
