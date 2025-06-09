const User = require("../models/User");
const { encrypt } = require("../utils/encrypt");

exports.connectBinance = async (req, res) => {
  try {
    const { userId, apiKey, apiSecret } = req.body;

    if (!userId || !apiKey || !apiSecret) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    await User.findOneAndUpdate(
      { userId },
      { binanceApiKey: encryptedKey, binanceApiSecret: encryptedSecret },
      { upsert: true, new: true }
    );

    res.json({ message: "Binance API connected successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
