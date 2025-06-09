const router = require("express").Router();
const { connectBinance } = require("../controllers/binanceController");

router.post("/connect", connectBinance);

module.exports = router;
