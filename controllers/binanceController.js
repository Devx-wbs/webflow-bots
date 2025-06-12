const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/User");
const { encrypt, decrypt } = require("../utils/encrypt");

// Helper to sign Binance API requests
const signQuery = (query, secret) =>
  crypto.createHmac("sha256", secret).update(query).digest("hex");

// ✅ Connect Binance API
exports.connectBinance = async (req, res) => {
  try {
    const { userId, apiKey, apiSecret } = req.body;
    if (!userId || !apiKey || !apiSecret) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    // Verify credentials
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = signQuery(query, apiSecret);

    const test = await axios.get(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );

    // Save encrypted keys
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    await User.findOneAndUpdate(
      { userId },
      { binanceApiKey: encryptedKey, binanceApiSecret: encryptedSecret },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: "Binance connected" });
  } catch (err) {
    console.error("Connect error:", err?.response?.data || err.message);
    return res
      .status(400)
      .json({ success: false, error: "Invalid API key or secret" });
  }
};

// ✅ Check if Binance is connected
exports.getBinanceStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await User.findOne({ userId });
    if (!user?.binanceApiKey || !user?.binanceApiSecret) {
      return res.json({ connected: false });
    }

    return res.json({ connected: true });
  } catch (err) {
    console.error("Status error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Disconnect Binance
exports.disconnectBinance = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    await User.findOneAndUpdate(
      { userId },
      { binanceApiKey: null, binanceApiSecret: null }
    );

    return res.json({ message: "Binance disconnected" });
  } catch (err) {
    console.error("Disconnect error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Wallet info
exports.getWalletInfo = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await User.findOne({ userId });
    if (!user?.binanceApiKey || !user?.binanceApiSecret) {
      return res.status(403).json({ error: "Binance not connected" });
    }

    const apiKey = decrypt(user.binanceApiKey);
    const apiSecret = decrypt(user.binanceApiSecret);
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = signQuery(query, apiSecret);

    const accountRes = await axios.get(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );

    const balances = accountRes.data.balances
      .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
      }));

    return res.json({ balances });
  } catch (err) {
    console.error("Wallet error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to fetch wallet info" });
  }
};

// ✅ Basic trade history (last 10)
exports.getTradeHistory = async (req, res) => {
  try {
    const { userId, symbol = "BTCUSDT" } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await User.findOne({ userId });
    if (!user?.binanceApiKey || !user?.binanceApiSecret) {
      return res.status(403).json({ error: "Binance not connected" });
    }

    const apiKey = decrypt(user.binanceApiKey);
    const apiSecret = decrypt(user.binanceApiSecret);
    const timestamp = Date.now();
    const query = `symbol=${symbol}&limit=10&timestamp=${timestamp}`;
    const signature = signQuery(query, apiSecret);

    const response = await axios.get(
      `https://api.binance.com/api/v3/myTrades?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );

    return res.json({ trades: response.data });
  } catch (err) {
    console.error("Trade history error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to fetch trade history" });
  }
};

exports.getBinanceStats = async (req, res) => {
  try {
    const { userId, symbol = "BTCUSDT" } = req.query;
    const user = await User.findOne({ userId });
    if (!user?.binanceApiKey || !user?.binanceApiSecret) {
      return res.status(403).json({ error: "Binance not connected" });
    }

    const apiKey = decrypt(user.binanceApiKey);
    const apiSecret = decrypt(user.binanceApiSecret);
    const timestamp = Date.now();
    const query = `symbol=${symbol}&limit=50&timestamp=${timestamp}`;
    const signature = signQuery(query, apiSecret);

    const response = await axios.get(
      `https://api.binance.com/api/v3/myTrades?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );

    const trades = response.data || [];
    const buyTrades = trades.filter((t) => t.isBuyer);
    const totalBuyQty = buyTrades.reduce(
      (sum, t) => sum + parseFloat(t.qty),
      0
    );
    const totalBuyQuote = buyTrades.reduce(
      (sum, t) => sum + parseFloat(t.quoteQty),
      0
    );
    const avgBuyPrice = totalBuyQuote / totalBuyQty || 0;

    res.json({
      tradingStats: {
        symbol,
        totalTrades: trades.length,
        totalBuyQty,
        totalBuyQuote,
        avgBuyPrice,
        lastTradeTime: trades.at(-1)?.time,
      },
    });
  } catch (err) {
    console.error("Stats error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to fetch trading stats" });
  }
};

exports.getEnhancedWallet = async (req, res) => {
  try {
    const { userId, sortBy = "usdValue", order = "desc" } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await User.findOne({ userId });
    if (!user?.binanceApiKey || !user?.binanceApiSecret) {
      return res.status(403).json({ error: "Binance not connected" });
    }

    const apiKey = decrypt(user.binanceApiKey);
    const apiSecret = decrypt(user.binanceApiSecret);
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(query)
      .digest("hex");

    const accountRes = await axios.get(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );

    const balances = accountRes.data.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    const priceRes = await axios.get(
      "https://api.binance.com/api/v3/ticker/price"
    );
    const prices = Object.fromEntries(
      priceRes.data.map((p) => [p.symbol, parseFloat(p.price)])
    );

    const wallet = [];
    let totalUsd = 0;

    for (const b of balances) {
      const asset = b.asset;
      const total = parseFloat(b.free) + parseFloat(b.locked);
      const symbol = asset === "USDT" ? "USDT" : `${asset}USDT`;
      const usdPrice = prices[symbol] || 0;
      const usdValue = total * usdPrice;

      wallet.push({ asset, total, usdPrice, usdValue });
      totalUsd += usdValue;
    }

    wallet.sort((a, b) => {
      if (sortBy === "asset") return a.asset.localeCompare(b.asset);
      if (sortBy === "usdValue")
        return order === "asc"
          ? a.usdValue - b.usdValue
          : b.usdValue - a.usdValue;
      return 0;
    });

    return res.json({ totalUsd: totalUsd.toFixed(2), assets: wallet });
  } catch (err) {
    console.error("Enhanced wallet error:", err?.response?.data || err.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch enhanced wallet info" });
  }
};
