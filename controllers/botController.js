const Bot = require("../models/bot");
const User = require("../models/User");
const threeCommas = require("../utils/threeCommas");

const isValidEnum = (val, options) => options.includes(val);

exports.createBot = async (req, res) => {
  const {
    userId,
    botName,
    direction,
    botType,
    pair,
    profitCurrency,
    baseOrderSize,
    startOrderType,
    takeProfitType,
    targetProfitPercent,
  } = req.body;

  // 🛡 Validation
  if (
    !userId ||
    !botName ||
    !direction ||
    !botType ||
    !pair ||
    !profitCurrency ||
    !baseOrderSize ||
    !startOrderType ||
    !takeProfitType ||
    !targetProfitPercent
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!isValidEnum(direction, ["long", "short"])) {
    return res
      .status(400)
      .json({ message: "Direction must be 'long' or 'short'" });
  }

  if (!isValidEnum(botType, ["single", "multi"])) {
    return res
      .status(400)
      .json({ message: "Bot type must be 'single' or 'multi'" });
  }

  if (!isValidEnum(profitCurrency, ["quote", "base"])) {
    return res
      .status(400)
      .json({ message: "Profit currency must be 'quote' or 'base'" });
  }

  if (!isValidEnum(startOrderType, ["market", "limit"])) {
    return res
      .status(400)
      .json({ message: "Start order type must be 'market' or 'limit'" });
  }

  if (!isValidEnum(takeProfitType, ["total", "step"])) {
    return res
      .status(400)
      .json({ message: "Take profit type must be 'total' or 'step'" });
  }

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const mappedBotType = botType === "single" ? "simple" : "composite";

    const payload = {
      name: botName,
      pair,
      strategy: direction,
      bot_type: mappedBotType,
      profit_currency: profitCurrency,
      base_order_volume: parseFloat(baseOrderSize),
      start_order_type: startOrderType,
      take_profit_type: takeProfitType,
      take_profit: parseFloat(targetProfitPercent),
      account_id: process.env.THREE_COMMAS_ACCOUNT_ID,
    };

    // ✅ Make the bot in 3Commas (but we don’t care about their botId now)
    const response = await threeCommas.post("/bots/create_bot", payload);
    console.log("📦 3Commas Response:", response.data);

    // ✅ Save your own bot in MongoDB
    const newBot = new Bot({
      user: user._id,
      name: botName,
      exchangeId: process.env.THREE_COMMAS_ACCOUNT_ID,
      pair,
      strategy: direction,
      botType,
      profitCurrency,
      baseOrderSize,
      startOrderType,
      takeProfitType,
      targetProfitPercent,
      threeCommasBotId: response.data?.id || null, // optional if you want to track later
    });

    await newBot.save();

    res.status(201).json({
      message: "Bot created successfully",
      botId: newBot._id, // ✅ your bot ID
      bot: newBot,
    });
  } catch (error) {
    console.error("❌ Bot creation failed:", error?.response?.data || error);
    res.status(500).json({
      message: "Bot creation failed",
      error: error?.response?.data || error.message || error,
    });
  }
};
