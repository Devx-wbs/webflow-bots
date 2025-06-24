const { fetchFrom3Commas } = require("../utils/threeCommas");
const Bot = require("../models/Bots");
const User = require("../models/User");

exports.createBot = async (req, res) => {
  const {
    userId,
    name,
    pair,
    bot_type,
    base_order_volume,
    start_order_type,
    take_profit_type,
    take_profit_percentage,
    strategy,
    profit_currency,
  } = req.body;

  if (!userId || !name || !pair) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const botPayload = {
      name,
      account_id: process.env.THREE_COMMAS_ACCOUNT_ID,
      pair,
      bot_type,
      base_order_volume,
      start_order_type,
      take_profit_type,
      take_profit_percentage,
      strategy_list: [strategy],
      profit_currency,
      is_enabled: false,
    };

    const response = await fetchFrom3Commas(
      "post",
      "/bots/create_bot",
      botPayload
    );
    const botData = response.data;

    await Bot.create({
      userId,
      botId: botData.id,
      name: botData.name,
      pair: botData.pair,
      bot_type: botData.bot_type,
      strategy,
      profit_currency,
      base_order_volume,
      take_profit_percentage,
      start_order_type,
      take_profit_type,
      is_enabled: botData.is_enabled,
    });

    res.status(200).json({ message: "Bot created", data: botData });
  } catch (err) {
    console.error("Bot creation failed:", err?.response?.data || err.message);
    res.status(500).json({
      error: "Bot creation failed",
      details: err?.response?.data || err.message,
    });
  }
};
