const crypto = require("crypto");
const axios = require("axios");

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const BASE_API = "https://api.3commas.io/public/api/ver1";

// HMAC-SHA256 helper
function sign(path, body = "") {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = timestamp + path + body;
  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(message)
    .digest("hex");
  return { timestamp, signature };
}

async function fetchFrom3Commas(method, path, data = "") {
  const { timestamp, signature } = sign(path, data ? JSON.stringify(data) : "");

  return await axios({
    method,
    url: BASE_API + path,
    data: data ? data : undefined,
    headers: {
      APIKEY: API_KEY,
      "API-Signature": signature,
      "API-Timestamp": timestamp,
    },
  });
}

module.exports = { fetchFrom3Commas };
