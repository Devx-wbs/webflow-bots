const api = require("../utils/threeCommas");

// List all bots for a particular user
exports.listBots = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  // TODO: Validate if the user owns the API credentials
  // For now we reuse `api` directly. Ideally you'd instate per-user API
  try {
    const response = await api.get("/bots"); // 3Commas API to list all
    res.json(response.data);
  } catch (err) {
    console.error(err?.response?.data || err?.message);
    res.status(500).json({ error: "Failed to fetch bots" });
  }
};

exports.activateBot = async (req, res) => {
  const { botId } = req.params;

  if (!botId) {
    return res.status(400).json({ error: "botId is required" });
  }

  try {
    const response = await api.post(`/bots/${botId}/start`); // activate bot
    res.json({ message: "Bot activated successfully", data: response.data });
  } catch (err) {
    console.error(err?.response?.data || err?.message);
    res.status(500).json({ error: "Failed to activate bot" });
  }
};

exports.stopBot = async (req, res) => {
  const { botId } = req.params;

  if (!botId) {
    return res.status(400).json({ error: "botId is required" });
  }

  try {
    const response = await api.post(`/bots/${botId}/disable`); // deactivate bot
    res.json({ message: "Bot deactivated successfully", data: response.data });
  } catch (err) {
    console.error(err?.response?.data || err?.message);
    res.status(500).json({ error: "Failed to deactivate bot" });
  }
};
