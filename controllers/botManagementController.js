const { fetchFrom3Commas } = require("../utils/threeCommas");

exports.listBots = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  // Ideally, validate userId against your own DB first.

  try {
    const response = await fetchFrom3Commas("get", "/bots");

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
    const response = await fetchFrom3Commas("post", `/bots/${botId}/start`);

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
    const response = await fetchFrom3Commas("post", `/bots/${botId}/disable`);

    res.json({ message: "Bot deactivated successfully", data: response.data });
  } catch (err) {
    console.error(err?.response?.data || err?.message);
    res.status(500).json({ error: "Failed to deactivate bot" });
  }
};
