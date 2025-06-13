let allCoins = [];
let currentChart = null;
let chartType = "line";
let autoRefreshTimer = null;

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

async function fetchChartData(id, days = 1) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`
  );
  return await res.json();
}

async function loadChart(id, days = 1, type = "line", showVolume = true) {
  const ctx = document.getElementById("chart").getContext("2d");
  const data = await fetchChartData(id, days);

  if (currentChart) currentChart.destroy();

  const labels = data.prices.map((p) => new Date(p[0]).toLocaleDateString());
  const prices = data.prices.map((p) => p[1]);
  const volumes = data.total_volumes.map((v) => v[1]);

  if (type === "line") {
    currentChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Price",
            data: prices,
            borderColor: "#3e95cd",
            fill: false,
          },
          ...(showVolume
            ? [
                {
                  label: "Volume",
                  data: volumes,
                  yAxisID: "volume",
                  borderColor: "rgba(0,255,0,0.5)",
                  backgroundColor: "rgba(0,255,0,0.2)",
                  type: "bar",
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false,
          },
          ...(showVolume
            ? {
                volume: {
                  position: "right",
                  beginAtZero: true,
                  grid: { display: false },
                },
              }
            : {}),
        },
      },
    });
  } else {
    const candles = data.prices.map((p, i) => ({
      x: new Date(p[0]),
      o: prices[i],
      h: prices[i] + Math.random() * 2,
      l: prices[i] - Math.random() * 2,
      c: prices[i],
    }));

    currentChart = new Chart(ctx, {
      type: "candlestick",
      data: {
        datasets: [
          {
            label: "Candlestick",
            data: candles,
            borderColor: "#00ff00",
          },
        ],
      },
      options: {
        responsive: true,
      },
    });
  }
}

async function updateCoinInfo(id) {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
  const data = await res.json();
  const infoDiv = document.getElementById("coin-info");
  const price = data.market_data.current_price.usd;
  const change = data.market_data.price_change_percentage_24h;
  const arrow = change >= 0 ? "▲" : "▼";
  const color = change >= 0 ? "limegreen" : "red";
  infoDiv.innerHTML = `
    <h3>${data.name} (${data.symbol.toUpperCase()})</h3>
    <p>Price: ${formatPrice(price)}</p>
    <p style="color:${color};">24h Change: ${change.toFixed(2)}% ${arrow}</p>
  `;
}

async function initMarketWidget() {
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

  let currentId = "bitcoin";
  renderOptions(filterCoins(""));

  async function refresh() {
    await updateCoinInfo(currentId);
    await loadChart(
      currentId,
      timeframe.value,
      chartType,
      volumeToggle.checked
    );
  }

  select.addEventListener("change", async () => {
    currentId = select.value;
    await refresh();
  });

  toggleBtn.addEventListener("click", async () => {
    chartType = chartType === "line" ? "candlestick" : "line";
    toggleBtn.textContent =
      chartType === "line" ? "Switch to Candle" : "Switch to Line";
    await refresh();
  });

  timeframe.addEventListener("change", refresh);
  volumeToggle.addEventListener("change", refresh);

  await refresh();

  autoRefreshTimer = setInterval(refresh, 30000); // 30s
}

window.addEventListener("DOMContentLoaded", initMarketWidget);
