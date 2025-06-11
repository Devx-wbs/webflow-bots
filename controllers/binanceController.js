const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/User");
const { encrypt } = require("../utils/encrypt");

exports.connectBinance = async (req, res) => {
  try {
    const { userId, apiKey, apiSecret } = req.body;

    if (!userId || !apiKey || !apiSecret) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Step 1: Verify API credentials with Binance
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(queryString)
      .digest("hex");

    const binanceResponse = await axios.get(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        headers: { "X-MBX-APIKEY": apiKey },
      }
    );

    // Step 2: Save encrypted credentials in DB only if connection works
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    await User.findOneAndUpdate(
      { userId },
      { binanceApiKey: encryptedKey, binanceApiSecret: encryptedSecret },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json({ success: true, message: "Binance API connected successfully" });
  } catch (err) {
    console.error(
      "Binance connection error:",
      err.response?.data || err.message
    );
    return res
      .status(400)
      .json({ success: false, error: "Invalid Binance API key or secret" });
  }
};
