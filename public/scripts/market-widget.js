let allCoins = [];
let currentChart = null;
let chartType = "line";
let refreshInterval;
let currentId = "bitcoin";

async function fetchCoins() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
  const coins = await res.json();
  allCoins = coins.filter((c) => c.symbol.length <= 6);
  return allCoins;
}

function filterCoins(query) {
  return allCoins.filter(
    (c) =>
      c.symbol.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
  );
}

function formatPrice(price) {
  if (price > 1) return `$${price.toFixed(2)}`;
  if (price > 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

async function fetchChartData(id, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  return await res.json();
}

async function loadChart(id, days = 1, type = "line", showVolume = true) {
  const ctx = document.getElementById("chart").getContext("2d");
  const chartData = await fetchChartData(id, days);

  const labels = chartData.prices.map((p) => new Date(p[0]).toLocaleString());
  const prices = chartData.prices.map((p) => p[1]);
  const volumes = chartData.total_volumes.map((v) => v[1]);

  if (currentChart) currentChart.destroy();

  if (type === "line") {
    currentChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Price",
            data: prices,
            borderColor: "deepskyblue",
            fill: false,
          },
          ...(showVolume
            ? [
                {
                  label: "Volume",
                  data: volumes,
                  type: "bar",
                  yAxisID: "volume",
                  backgroundColor: "rgba(0,255,0,0.3)",
                },
              ]
            : []),
        ],
      },
      options: {
        scales: {
          volume: {
            position: "right",
            beginAtZero: true,
            grid: { display: false },
          },
        },
      },
    });
  } else {
    const candles = chartData.prices.map((p, i) => ({
      x: new Date(p[0]),
      o: prices[i] - 1,
      h: prices[i] + 2,
      l: prices[i] - 2,
      c: prices[i],
    }));

    currentChart = new Chart(ctx, {
      type: "candlestick",
      data: {
        datasets: [
          {
            label: "Candlestick",
            data: candles,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
}

async function updateCoinInfo(id) {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
  const data = await res.json();
  const price = data.market_data.current_price.usd;
  const change = data.market_data.price_change_percentage_24h;
  const arrow = change >= 0 ? "▲" : "▼";
  const color = change >= 0 ? "limegreen" : "red";

  document.getElementById("coin-info").innerHTML = `
    <h3>${data.name} (${data.symbol.toUpperCase()})</h3>
    <p>💵 Price: ${formatPrice(price)}</p>
    <p style="color:${color}">24h Change: ${change.toFixed(2)}% ${arrow}</p>
  `;
}

async function refreshData(id, days, type, showVolume) {
  await updateCoinInfo(id);
  await loadChart(id, days, type, showVolume);
}

async function initMarketWidget() {
  try {
    await fetchCoins();
    const select = document.getElementById("coin-select");
    const input = document.getElementById("coin-search");
    const toggleBtn = document.getElementById("toggle-chart");
    const timeframe = document.getElementById("timeframe-select");
    const volumeToggle = document.getElementById("volume-toggle");

    const renderOptions = (coins) => {
      select.innerHTML = coins
        .map(
          (c) =>
            `<option value="${c.id}">${
              c.name
            } (${c.symbol.toUpperCase()})</option>`
        )
        .join("");
    };

    input.addEventListener("input", () => {
      const filtered = filterCoins(input.value);
      renderOptions(filtered);
    });

    select.addEventListener("change", () => {
      currentId = select.value;
      refreshData(currentId, timeframe.value, chartType, volumeToggle.checked);
    });

    toggleBtn.addEventListener("click", () => {
      chartType = chartType === "line" ? "candlestick" : "line";
      toggleBtn.innerText =
        chartType === "line" ? "Switch to Candle" : "Switch to Line";
      refreshData(currentId, timeframe.value, chartType, volumeToggle.checked);
    });

    timeframe.addEventListener("change", () => {
      refreshData(currentId, timeframe.value, chartType, volumeToggle.checked);
    });

    volumeToggle.addEventListener("change", () => {
      refreshData(currentId, timeframe.value, chartType, volumeToggle.checked);
    });

    // Load default chart
    renderOptions(allCoins);
    refreshData(currentId, timeframe.value, chartType, volumeToggle.checked);

    // Auto Refresh
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      refreshData(currentId, timeframe.value, chartType, volumeToggle.checked);
    }, 30000);
  } catch (err) {
    console.error("Widget init failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", initMarketWidget);
