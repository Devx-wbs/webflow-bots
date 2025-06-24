const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: String, // From Memberstack
    binanceApiKey: String,
    binanceApiSecret: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
