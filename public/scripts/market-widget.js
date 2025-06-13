// public/scripts/market-widget.js

(async function () {
  const selectorDiv = document.getElementById("coin-selector-wrapper");
  const chartDiv = document.getElementById("coin-chart-wrapper");

  if (!selectorDiv || !chartDiv) {
    console.warn("Market Widget: Required divs not found.");
    return;
  }

  const createDropdown = (coins) => {
    const select = document.createElement("select");
    select.style.padding = "10px";
    select.style.marginBottom = "20px";
    select.style.borderRadius = "5px";
    select.style.fontSize = "16px";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a coin...";
    select.appendChild(defaultOption);

    coins.forEach((coin) => {
      const option = document.createElement("option");
      option.value = coin.id;
      option.textContent = coin.name;
      select.appendChild(option);
    });

    select.addEventListener("change", async (e) => {
      const coinId = e.target.value;
      if (coinId) {
        await loadChart(coinId);
      }
    });

    selectorDiv.appendChild(select);
  };

  const loadChart = async (coinId) => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1`
      );
      const data = await res.json();

      const labels = data.prices.map((p) => {
        const date = new Date(p[0]);
        return `${date.getHours()}:${date.getMinutes()}`;
      });

      const prices = data.prices.map((p) => p[1]);

      chartDiv.innerHTML = `<canvas id="coinChart" height="300"></canvas>`;

      const ctx = document.getElementById("coinChart").getContext("2d");

      if (window.coinChartInstance) {
        window.coinChartInstance.destroy();
      }

      window.coinChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: `${coinId.toUpperCase()} Price (USD)`,
              data: prices,
              borderColor: "#0f9d58",
              backgroundColor: "rgba(15, 157, 88, 0.1)",
              fill: true,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { ticks: { color: "#999" }, grid: { color: "#eee" } },
            y: { ticks: { color: "#999" }, grid: { color: "#eee" } },
          },
        },
      });
    } catch (err) {
      console.error("Error loading chart:", err);
    }
  };

  const fetchCoins = async () => {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
      const coins = await res.json();
      return coins.slice(0, 100); // first 100 coins for simplicity
    } catch (err) {
      console.error("Error fetching coin list:", err);
      return [];
    }
  };

  const coins = await fetchCoins();
  createDropdown(coins);
})();
