const api = require("../utils/threeCommas");

exports.createBot = async (req, res) => {
  try {
    const {
      name,
      pair,
      base_order_volume,
      take_profit_percentage,
      safety_order_volume,
      safety_order_step_percentage,
      martingale_volume_coefficient,
      martingale_step_coefficient,
      max_safety_orders,
      active_safety_orders_count,
      cooldown,
    } = req.body;

    const botPayload = {
      name,
      account_id: 1234567, // Replace with your 3Commas account ID
      pair,
      base_order_volume,
      take_profit_percentage,
      safety_order_volume,
      safety_order_step_percentage,
      martingale_volume_coefficient,
      martingale_step_coefficient,
      max_safety_orders,
      active_safety_orders_count,
      cooldown,
      take_profit_type: "total",
      strategy_list: ["long"],
    };

    const response = await api.post("/bots/create_bot", botPayload);
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to create bot",
      details: err.response?.data || err.message,
    });
  }
};
