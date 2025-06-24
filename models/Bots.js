const mongoose = require("mongoose");

const botSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Memberstack userId
  botId: { type: Number, required: true }, // 3Commas bot ID
  name: String,
  pair: String,
  bot_type: String,
  strategy: String,
  profit_currency: String,
  base_order_volume: Number,
  take_profit_percentage: Number,
  start_order_type: String,
  take_profit_type: String,
  is_enabled: Boolean,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Bot", botSchema);
