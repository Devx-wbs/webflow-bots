const axios = require("axios");

const api = axios.create({
  baseURL: "https://api.3commas.io/public/api/ver1",
  headers: {
    APIKEY: process.env.THREE_COMMAS_API_KEY,
    Signature: process.env.THREE_COMMAS_API_SECRET,
  },
});

module.exports = api;
