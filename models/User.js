const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: String, // Memberstack ID
    binanceApiKey: String,
    binanceApiSecret: String,
    bots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bot" }], // optional
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
