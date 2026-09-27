const state = {
  region: document.getElementById("region-select").value,
  target: document.querySelector(".target-tab.active").dataset.target,
  chart: null,
};

const targetMeta = {
  temp: { unit: "°C", label: "Temperature", key: "temp" },
  rain: { unit: "mm", label: "Rainfall", key: "rain" },
  wind: { unit: "km/h", label: "Wind", key: "wind" },
};

const regimeIcons = {
  Clear: "☀️",
  Monsoon: "🌧️",
  PostMonsoon: "🍂",
  PreMonsoon: "🌤️",
  Winter: "❄️",
  Heatwave: "🔥",
  Coldwave: "🧊",
  Storm: "⚡",
  Cyclone: "🌀",
};

async function getJSON(url) {
  const response = await fetch(url);
  return response.json();
}

function formatNumber(value) {
  return Number(value).toFixed(1);
}

function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function updateChartTheme() {
  if (!state.chart) return;

  const datasetColors = [
    "--chart-observed",
    "--chart-nwp",
    "--chart-ai",
    "--chart-ensemble",
    "--chart-blitzcast",
  ];

  state.chart.data.datasets.forEach((dataset, index) => {
    dataset.borderColor = cssColor(datasetColors[index]);
  });
  
  if (state.chart.options.plugins.legend) {
    state.chart.options.plugins.legend.labels.color = cssColor("--chart-text");
  }
  if (state.chart.options.scales) {
    if (state.chart.options.scales.x) {
      state.chart.options.scales.x.ticks.color = cssColor("--chart-text");
      state.chart.options.scales.x.grid.color = cssColor("--chart-grid");
    }
    if (state.chart.options.scales.y) {
      state.chart.options.scales.y.ticks.color = cssColor("--chart-text");
      state.chart.options.scales.y.grid.color = cssColor("--chart-grid");
    }
  }
  state.chart.update("none");
}

async function renderHero() {
  const current = await getJSON(`/api/current/${state.region}`);
  const meta = targetMeta[state.target];
  
  document.getElementById("hero-region").textContent = state.region;
  document.getElementById("hero-value").textContent = formatNumber(current[meta.key]);
  document.getElementById("hero-unit").textContent = meta.unit;
  
  const icon = regimeIcons[current.regime] || "🌤️";
  document.getElementById("hero-regime").textContent = `${icon} ${current.regime} · ${current.season}`;
  
  document.getElementById("stat-humidity").textContent = `${formatNumber(current.humidity)}%`;
  document.getElementById("stat-pressure").textContent = `${formatNumber(current.pressure)} hPa`;
  document.getElementById("stat-date").textContent = current.date;
}

async function renderForecastStats() {
  const forecast = await getJSON(`/api/forecast/${state.region}/${state.target}`);
  document.getElementById("stat-confidence").textContent = `${forecast.confidence}%`;

  const bars = document.getElementById("weight-bars");
  bars.innerHTML = "";
  const labels = { nwp: "NWP Model", ai: "AI Deep Ensemble", ensemble: "Statistical Blend" };
  const sourceClasses = { nwp: "source-nwp", ai: "source-ai", ensemble: "source-ensemble" };
  const sourceColors = { nwp: "#2563eb", ai: "#7c3aed", ensemble: "#059669" };

  Object.entries(forecast.weights).forEach(([source, value]) => {
    const row = document.createElement("div");
    row.className = "weight-row";
    row.innerHTML = `
      <div class="weight-row-head">
        <div class="weight-row-source">
          <span class="weight-source-dot" style="background-color: ${sourceColors[source] || 'var(--yellow)'}"></span>
          <span>${labels[source] || source}</span>
        </div>
        <span class="weight-row-pct">${Math.round(value * 100)}%</span>
      </div>
      <div class="weight-track">
        <div class="weight-fill ${sourceClasses[source] || ''}" style="width:${value * 100}%"></div>
      </div>
    `;
    bars.appendChild(row);
  });
}

async function renderComparison() {
  const rows = await getJSON(`/api/comparison/${state.region}/${state.target}`);
  const body = document.getElementById("comparison-body");
  body.innerHTML = "";
  const bestMae = Math.min(...rows.map((row) => row.mae));

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const isBest = row.mae === bestMae;
    if (isBest) tr.classList.add("best");
    
    tr.innerHTML = `
      <td>
        <strong>${row.model}</strong>
        ${isBest ? '<span class="best-badge">★ Best Accuracy</span>' : ''}
      </td>
      <td>${row.mae}</td>
      <td>${row.rmse}</td>
      <td>${row.r2}</td>
      <td>${row.bias}</td>
    `;
    body.appendChild(tr);
  });
}

async function renderTimeseries() {
  const series = await getJSON(`/api/timeseries/${state.region}/${state.target}?days=30`);
  const labels = series.map((point) => point.date.slice(5));
  
  const datasets = [
    { 
      label: "Observed", 
      data: series.map((p) => p.actual), 
      borderColor: cssColor("--chart-observed"), 
      borderWidth: 2.5, 
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    { 
      label: "NWP", 
      data: series.map((p) => p.nwp), 
      borderColor: cssColor("--chart-nwp"), 
      borderWidth: 1.8, 
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4
    },
    { 
      label: "AI Model", 
      data: series.map((p) => p.ai_model), 
      borderColor: cssColor("--chart-ai"), 
      borderWidth: 1.8, 
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4
    },
    { 
      label: "Ensemble", 
      data: series.map((p) => p.ensemble), 
      borderColor: cssColor("--chart-ensemble"), 
      borderWidth: 1.8, 
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4
    },
    { 
      label: "BlitzCast Blend", 
      data: series.map((p) => p.blitzcast_weighted), 
      borderColor: cssColor("--chart-blitzcast"), 
      borderWidth: 3.2, 
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 6,
      borderDash: []
    },
  ];

  const ctx = document.getElementById("timeseries-chart");
  if (!ctx) return;

  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    updateChartTheme();
    state.chart.update();
    return;
  }

  if (typeof Chart === "undefined") {
    console.warn("Chart.js is not yet available");
    return;
  }

  state.chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: cssColor("--chart-text"),
            boxWidth: 12,
            boxHeight: 12,
            padding: 16,
            usePointStyle: true,
            font: { family: "Plus Jakarta Sans", size: 12, weight: "600" }
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleFont: { family: "Plus Jakarta Sans", size: 13, weight: "700" },
          bodyFont: { family: "Plus Jakarta Sans", size: 12 },
          padding: 10,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          ticks: { color: cssColor("--chart-text"), font: { family: "Space Grotesk", size: 11 } },
          grid: { display: false, color: cssColor("--chart-grid") }
        },
        y: {
          ticks: { color: cssColor("--chart-text"), font: { family: "Space Grotesk", size: 11 } },
          grid: { color: cssColor("--chart-grid") }
        },
      },
    },
  });
}

async function renderWeightsMap() {
  const rows = await getJSON(`/api/weights-map/${state.target}`);
  const grid = document.getElementById("region-weight-grid");
  grid.innerHTML = "";

  rows.forEach((row) => {
    const card = document.createElement("div");
    card.className = "region-weight-card";
    card.innerHTML = `
      <h3>${row.region}</h3>
      <div class="mini-bar-row">
        <span class="mini-bar-label">NWP</span>
        <div class="mini-track">
          <div class="mini-fill" style="width:${row.nwp * 100}%; background: linear-gradient(90deg, #2563eb, #60a5fa)"></div>
        </div>
        <span class="mini-pct">${Math.round(row.nwp * 100)}%</span>
      </div>
      <div class="mini-bar-row">
        <span class="mini-bar-label">AI</span>
        <div class="mini-track">
          <div class="mini-fill" style="width:${row.ai_model * 100}%; background: linear-gradient(90deg, #7c3aed, #a78bfa)"></div>
        </div>
        <span class="mini-pct">${Math.round(row.ai_model * 100)}%</span>
      </div>
      <div class="mini-bar-row">
        <span class="mini-bar-label">Ens</span>
        <div class="mini-track">
          <div class="mini-fill" style="width:${row.ensemble * 100}%; background: linear-gradient(90deg, #059669, #34d399)"></div>
        </div>
        <span class="mini-pct">${Math.round(row.ensemble * 100)}%</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function renderExtreme() {
  const data = await getJSON(`/api/extreme/${state.region}`);
  const alertBox = document.getElementById("extreme-alert");
  alertBox.classList.toggle("active", data.alert);

  const icon = data.alert ? "⚠️" : "🛡️";
  alertBox.innerHTML = data.alert
    ? `<span>${icon}</span> <span>Active regime risk: <strong>${data.latest_regime}</strong> recorded on ${data.latest_date}</span>`
    : `<span>${icon}</span> <span>No extreme anomalies in the past 3 days · Latest regime: <strong>${data.latest_regime}</strong></span>`;

  const tally = document.getElementById("regime-tally");
  tally.innerHTML = "";
  Object.entries(data.regime_counts).forEach(([regime, count]) => {
    const chip = document.createElement("div");
    chip.className = "regime-chip";
    const rIcon = regimeIcons[regime] || "🌤️";
    chip.innerHTML = `${rIcon} ${regime} <span>${count}</span>`;
    tally.appendChild(chip);
  });
}

async function renderAll() {
  await Promise.all([
    renderHero(),
    renderForecastStats(),
    renderComparison(),
    renderTimeseries(),
    renderWeightsMap(),
    renderExtreme(),
  ]);
}

// Region Select Event
document.getElementById("region-select").addEventListener("change", (event) => {
  state.region = event.target.value;
  renderAll();
});

// Variable Target Tabs Event
document.querySelectorAll(".target-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".target-tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    state.target = tab.dataset.target;
    renderAll();
  });
});

// Sun / Moon Theme Toggle Handler
const themeToggle = document.getElementById("theme-toggle");

function updateThemeToggleAria() {
  const isDark = document.documentElement.dataset.theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
}

updateThemeToggleAria();

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  const newTheme = isDark ? "light" : "dark";
  document.documentElement.dataset.theme = newTheme;
  
  try {
    localStorage.setItem("blitzcast-theme", newTheme);
  } catch {}
  
  updateThemeToggleAria();
  updateChartTheme();
});

// Initial Data Load
renderAll();