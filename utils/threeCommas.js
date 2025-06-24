const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const API_KEY = process.env.THREE_COMMAS_API_KEY;
const API_SECRET = process.env.THREE_COMMAS_API_SECRET;

if (!API_KEY) {
  console.error("❌ THREE_COMMAS_API_KEY is undefined.");
}

if (!API_SECRET) {
  console.error("❌ THREE_COMMAS_API_SECRET is undefined.");
}

function sign(path, body = "") {
  if (!API_SECRET) {
    throw new Error("API_SECRET is undefined. Check your .env configuration");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const message = timestamp + path + (body ? JSON.stringify(body) : "");
  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(message)
    .digest("hex");

  return { timestamp, signature };
}

const API = axios.create({ baseURL: "https://api.3commas.io/public/api/ver1" });

API.interceptors.request.use(
  (config) => {
    // Sign the path and body
    const path = config.url?.replace(API.defaults.baseURL, "") || config.url;
    const { timestamp, signature } = sign(path, config.data);

    config.headers.APIKEY = API_KEY;
    config.headers.Signature = signature;
    config.headers.timestamp = timestamp;

    return config;
  },
  (error) => Promise.reject(error)
);

async function fetchFrom3Commas(method, path, data = {}) {
  if (method.toLowerCase() === "get") {
    return API.get(path);
  } else if (method.toLowerCase() === "post") {
    return API.post(path, data);
  } else if (method.toLowerCase() === "delete") {
    return API.delete(path);
  }
}

module.exports = { fetchFrom3Commas };
