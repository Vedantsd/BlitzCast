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

async function getJSON(url) {
  const response = await fetch(url);
  return response.json();
}

function formatNumber(value) {
  return Number(value).toFixed(1);
}

async function renderHero() {
  const current = await getJSON(`/api/current/${state.region}`);
  const meta = targetMeta[state.target];
  document.getElementById("hero-region").textContent = state.region;
  document.getElementById("hero-value").textContent = formatNumber(current[meta.key]);
  document.getElementById("hero-unit").textContent = meta.unit;
  document.getElementById("hero-regime").textContent = `${current.regime} · ${current.season}`;
  document.getElementById("stat-humidity").textContent = `${formatNumber(current.humidity)}%`;
  document.getElementById("stat-pressure").textContent = `${formatNumber(current.pressure)} hPa`;
  document.getElementById("stat-date").textContent = current.date;
}

async function renderForecastStats() {
  const forecast = await getJSON(`/api/forecast/${state.region}/${state.target}`);
  document.getElementById("stat-confidence").textContent = `${forecast.confidence}%`;

  const bars = document.getElementById("weight-bars");
  bars.innerHTML = "";
  const labels = { nwp: "NWP", ai: "AI Model", ensemble: "Ensemble" };
  Object.entries(forecast.weights).forEach(([source, value]) => {
    const row = document.createElement("div");
    row.className = "weight-row";
    row.innerHTML = `
      <div class="weight-row-head">
        <span>${labels[source]}</span>
        <span>${Math.round(value * 100)}%</span>
      </div>
      <div class="weight-track">
        <div class="weight-fill" style="width:${value * 100}%"></div>
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
    if (row.mae === bestMae) tr.classList.add("best");
    tr.innerHTML = `
      <td>${row.model}</td>
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
    { label: "Observed", data: series.map((p) => p.actual), borderColor: "#16150f", borderWidth: 2.5, pointRadius: 0 },
    { label: "NWP", data: series.map((p) => p.nwp), borderColor: "#c9c2a6", borderWidth: 1.5, pointRadius: 0 },
    { label: "AI Model", data: series.map((p) => p.ai_model), borderColor: "#e8a400", borderWidth: 1.5, pointRadius: 0 },
    { label: "Ensemble", data: series.map((p) => p.ensemble), borderColor: "#9a9380", borderWidth: 1.5, pointRadius: 0 },
    { label: "BlitzCast", data: series.map((p) => p.blitzcast_weighted), borderColor: "#ffc629", borderWidth: 3, pointRadius: 0 },
  ];

  const ctx = document.getElementById("timeseries-chart");
  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    state.chart.update();
    return;
  }
  state.chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "IBM Plex Sans" } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#ece7d6" } },
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
      <div class="mini-bar-row"><span>NWP</span><div class="mini-track"><div class="mini-fill" style="width:${row.nwp * 100}%"></div></div><span>${Math.round(row.nwp * 100)}%</span></div>
      <div class="mini-bar-row"><span>AI</span><div class="mini-track"><div class="mini-fill" style="width:${row.ai_model * 100}%"></div></div><span>${Math.round(row.ai_model * 100)}%</span></div>
      <div class="mini-bar-row"><span>Ens</span><div class="mini-track"><div class="mini-fill" style="width:${row.ensemble * 100}%"></div></div><span>${Math.round(row.ensemble * 100)}%</span></div>
    `;
    grid.appendChild(card);
  });
}

async function renderExtreme() {
  const data = await getJSON(`/api/extreme/${state.region}`);
  const alertBox = document.getElementById("extreme-alert");
  alertBox.classList.toggle("active", data.alert);
  alertBox.textContent = data.alert
    ? `Active regime risk: ${data.latest_regime} as of ${data.latest_date}`
    : `No extreme signals in the last 3 days · latest regime ${data.latest_regime}`;

  const tally = document.getElementById("regime-tally");
  tally.innerHTML = "";
  Object.entries(data.regime_counts).forEach(([regime, count]) => {
    const chip = document.createElement("div");
    chip.className = "regime-chip";
    chip.innerHTML = `${regime} <span>${count}</span>`;
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

document.getElementById("region-select").addEventListener("change", (event) => {
  state.region = event.target.value;
  renderAll();
});

document.querySelectorAll(".target-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".target-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.target = tab.dataset.target;
    renderAll();
  });
});

renderAll();