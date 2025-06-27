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

    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = signQuery(query, apiSecret);

    await axios.get(
      `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );

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

// ✅ Get Binance Connection Status
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

exports.getFullWalletInfo = async (req, res) => {
  try {
    const {
      userId,
      sort = "value",
      order = "desc",
      timeframe = "7d",
    } = req.query;
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

    let balances = accountRes.data.balances
      .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
      }));

    const symbols = balances.map((b) => b.asset + "USDT");
    const priceRes = await axios.get(
      "https://api.binance.com/api/v3/ticker/price"
    );
    const priceMap = Object.fromEntries(
      priceRes.data.map((p) => [p.symbol, parseFloat(p.price)])
    );

    const now = Date.now();
    const startTimestamps = {
      "1d": now - 1 * 24 * 60 * 60 * 1000,
      "7d": now - 7 * 24 * 60 * 60 * 1000,
      "30d": now - 30 * 24 * 60 * 60 * 1000,
      "180d": now - 180 * 24 * 60 * 60 * 1000,
      "360d": now - 360 * 24 * 60 * 60 * 1000,
    };
    const fromTime =
      isNaN(Date.parse(timeframe)) && startTimestamps[timeframe]
        ? startTimestamps[timeframe]
        : new Date(timeframe).getTime(); // custom

    const walletDetails = await Promise.all(
      balances.map(async (b) => {
        const symbol = b.asset + "USDT";
        const currentPrice = priceMap[symbol] || 0;
        const total = (b.free + b.locked) * currentPrice;

        let change = 0;
        try {
          const klineQuery = `symbol=${symbol}&interval=1d&limit=1&startTime=${fromTime}`;
          const klineRes = await axios.get(
            `https://api.binance.com/api/v3/klines?${klineQuery}`
          );
          const [open] = klineRes.data?.[0] || [];
          const pastPrice = parseFloat(open);
          if (pastPrice) {
            change = ((currentPrice - pastPrice) / pastPrice) * 100;
          }
        } catch (_) {
          change = 0;
        }

        return {
          asset: b.asset,
          free: b.free,
          locked: b.locked,
          total,
          price: currentPrice,
          trend: change.toFixed(2),
        };
      })
    );

    const totalWalletUSD = walletDetails.reduce((sum, a) => sum + a.total, 0);

    // Sort assets by total USD value descending for response
    walletDetails.sort((a, b) => b.total - a.total);

    // ➕ Only top 5 assets for historical chart
    const top5 = walletDetails.slice(0, 5);
    const limit = 30;
    const trendData = [];

    for (let i = limit - 1; i >= 0; i--) {
      const dayTimestamp = now - i * 24 * 60 * 60 * 1000;
      let dailyTotal = 0;

      for (const asset of top5) {
        const symbol = asset.asset + "USDT";
        try {
          const klineRes = await axios.get(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=1&startTime=${dayTimestamp}`
          );
          const [open] = klineRes.data?.[0] || [];
          const priceAtDay = parseFloat(open);
          const units = asset.free + asset.locked;
          dailyTotal += units * priceAtDay;
        } catch (_) {
          continue;
        }
      }

      trendData.push({
        time: new Date(dayTimestamp).toISOString().split("T")[0],
        value: parseFloat(dailyTotal.toFixed(2)),
      });
    }

    // Apply sorting after trend extraction (client-side sorting preserved)
    if (sort === "asset") {
      walletDetails.sort((a, b) =>
        order === "asc"
          ? a.asset.localeCompare(b.asset)
          : b.asset.localeCompare(a.asset)
      );
    } else {
      walletDetails.sort((a, b) =>
        order === "asc" ? a[sort] - b[sort] : b[sort] - a[sort]
      );
    }

    return res.json({
      totalUSD: totalWalletUSD.toFixed(2),
      assets: walletDetails,
      trendData,
    });
  } catch (err) {
    console.error("Full wallet error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to fetch wallet" });
  }
};

// ✅ Trade History (last 10)
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

// ✅ Trading Stats
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

exports.getSimpleWallet = async (req, res) => {
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

    const assets = accountRes.data.balances
      .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
      }));

    return res.json({ assets });
  } catch (err) {
    console.error("Simple wallet error:", err.message);
    return res.status(500).json({ error: "Failed to fetch wallet" });
  }
};
