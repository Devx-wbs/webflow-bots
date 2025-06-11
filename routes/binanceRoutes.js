const router = require("express").Router();
const {
  connectBinance,
  getBinanceStatus,
  disconnectBinance,
} = require("../controllers/binanceController");

router.post("/connect", connectBinance);
router.get("/status", getBinanceStatus);
router.post("/disconnect", disconnectBinance);

module.exports = router;
