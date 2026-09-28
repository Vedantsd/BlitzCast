/**
 * BlitzCast — Landing Page Interactive Logic
 * SIH 2026: AI-Enabled Weather Forecast Blending Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  // Theme Management
  const themeToggle = document.getElementById("theme-toggle");
  
  function getTheme() {
    return document.documentElement.dataset.theme || "light";
  }

  function setTheme(newTheme) {
    document.documentElement.dataset.theme = newTheme;
    try {
      localStorage.setItem("blitzcast-theme", newTheme);
    } catch (e) {}
    updateThemeToggleLabel();
    if (window.landingChart) updateChartColors(window.landingChart);
  }

  function updateThemeToggleLabel() {
    if (!themeToggle) return;
    const isDark = getTheme() === "dark";
    const label = isDark ? "Switch to light theme" : "Switch to dark theme";
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
  }

  if (themeToggle) {
    updateThemeToggleLabel();
    themeToggle.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  }

  // 10-Day Forecast Preview in Landing Page
  const defaultLocation = BlitzCastData.locations[0].id; // pune
  const forecastData = BlitzCastData.tenDayForecasts[defaultLocation] || [];
  
  const forecastStrip = document.getElementById("landing-forecast-strip");
  if (forecastStrip && forecastData.length > 0) {
    forecastStrip.innerHTML = "";
    forecastData.forEach((day, index) => {
      const card = document.createElement("div");
      card.className = `forecast-day-card ${index === 0 ? "active-day" : ""}`;
      
      const iconMap = {
        sunny: "☀️",
        rain: "🌧️",
        partly_cloudy: "🌤️",
        cloudy: "☁️",
        storm: "⛈️",
        windy: "💨",
        hazy: "🌫️"
      };

      card.innerHTML = `
        <span class="day-label">${day.day}</span>
        <span class="day-date">${day.date.split(", ")[1] || day.date}</span>
        <span class="day-icon">${iconMap[day.icon] || "🌤️"}</span>
        <div class="day-temps">
          <span class="day-high">${day.tempHigh}°</span>
          <span class="day-low">${day.tempLow}°</span>
        </div>
        <div class="day-rain-bar">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9.2 22 3-7"/></svg>
          <span>${day.rainProb}%</span>
        </div>
        <span class="day-wind-val">${day.wind} km/h</span>
      `;
      forecastStrip.appendChild(card);
    });
  }

  // Landing Page Chart (10-Day Temperature and Rainfall Blend)
  const chartCanvas = document.getElementById("landing-timeseries-chart");
  if (chartCanvas && typeof Chart !== "undefined") {
    const labels = forecastData.map(d => d.day);
    const temps = forecastData.map(d => d.tempHigh);
    const rains = forecastData.map(d => d.rainMm);

    const isDark = getTheme() === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";

    window.landingChart = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "line",
            label: "Blended Temp (°C)",
            data: temps,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            yAxisID: "y",
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#f59e0b"
          },
          {
            type: "bar",
            label: "Expected Rain (mm)",
            data: rains,
            backgroundColor: isDark ? "rgba(56, 189, 248, 0.65)" : "rgba(2, 132, 199, 0.65)",
            borderRadius: 6,
            yAxisID: "y1",
            barPercentage: 0.45
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: textColor,
              font: { family: "Plus Jakarta Sans", size: 12, weight: "600" },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: "Plus Jakarta Sans", size: 13, weight: "700" }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 } },
            grid: { display: false }
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: { display: true, text: "Temperature (°C)", color: textColor, font: { size: 11, weight: "600" } },
            ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 } },
            grid: { color: gridColor }
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: { display: true, text: "Rainfall (mm)", color: textColor, font: { size: 11, weight: "600" } },
            ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  function updateChartColors(chart) {
    if (!chart) return;
    const isDark = getTheme() === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";

    if (chart.options.plugins.legend) {
      chart.options.plugins.legend.labels.color = textColor;
    }
    if (chart.options.scales.x) {
      chart.options.scales.x.ticks.color = textColor;
    }
    if (chart.options.scales.y) {
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.y.grid.color = gridColor;
      chart.options.scales.y.title.color = textColor;
    }
    if (chart.options.scales.y1) {
      chart.options.scales.y1.ticks.color = textColor;
      chart.options.scales.y1.title.color = textColor;
    }
    chart.update("none");
  }

  // Dynamic Model Weight Demo Simulator (Lead time & regime changes)
  const leadTimeTabs = document.querySelectorAll(".lead-tab-btn");
  const weightBars = {
    ifs: document.getElementById("bar-weight-ifs"),
    aifs: document.getElementById("bar-weight-aifs"),
    ai: document.getElementById("bar-weight-ai"),
    ens: document.getElementById("bar-weight-ens")
  };
  const weightTexts = {
    ifs: document.getElementById("text-weight-ifs"),
    aifs: document.getElementById("text-weight-aifs"),
    ai: document.getElementById("text-weight-ai"),
    ens: document.getElementById("text-weight-ens")
  };
  const dominantBadge = document.getElementById("lead-dominant-badge");
  const rationaleText = document.getElementById("lead-rationale-text");

  if (leadTimeTabs.length > 0) {
    leadTimeTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        leadTimeTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const data = BlitzCastData.modelWeights.byLeadTime[index];
        if (data) {
          if (weightBars.ifs) weightBars.ifs.style.width = `${data.ifs}%`;
          if (weightBars.aifs) weightBars.aifs.style.width = `${data.aifs}%`;
          if (weightBars.ai) weightBars.ai.style.width = `${data.aiModel}%`;
          if (weightBars.ens) weightBars.ens.style.width = `${data.ensemble}%`;

          if (weightTexts.ifs) weightTexts.ifs.textContent = `${data.ifs}%`;
          if (weightTexts.aifs) weightTexts.aifs.textContent = `${data.aifs}%`;
          if (weightTexts.ai) weightTexts.ai.textContent = `${data.aiModel}%`;
          if (weightTexts.ens) weightTexts.ens.textContent = `${data.ensemble}%`;

          if (dominantBadge) dominantBadge.textContent = `Dominant: ${data.primary.split(" (")[0]}`;
          if (rationaleText) rationaleText.textContent = data.primary;
        }
      });
    });
  }

  // Regional Map Zone Selector on Landing Page
  const regionZoneButtons = document.querySelectorAll(".region-zone-btn");
  const mapRegionTitle = document.getElementById("map-region-name");
  const mapDominantName = document.getElementById("map-dominant-name");
  const mapRegionSkill = document.getElementById("map-region-skill");
  const mapRegionRationale = document.getElementById("map-region-rationale");
  const mapRegionWeights = {
    ifs: document.getElementById("map-weight-ifs"),
    aifs: document.getElementById("map-weight-aifs"),
    ai: document.getElementById("map-weight-ai"),
    ens: document.getElementById("map-weight-ens")
  };

  function selectRegion(code) {
    const regData = BlitzCastData.regionalWeights.find(r => r.code === code) || BlitzCastData.regionalWeights[0];
    
    regionZoneButtons.forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.region === code);
    });

    // Update SVG active state
    document.querySelectorAll(".map-region-shape").forEach(shape => {
      shape.classList.toggle("active-shape", shape.dataset.region === code);
    });

    if (mapRegionTitle) mapRegionTitle.textContent = regData.region;
    if (mapDominantName) mapDominantName.textContent = regData.dominantFullName;
    if (mapRegionSkill) mapRegionSkill.textContent = regData.topSkill;
    if (mapRegionRationale) mapRegionRationale.textContent = regData.rationale;

    if (mapRegionWeights.ifs) mapRegionWeights.ifs.textContent = `${regData.weights.ifs}%`;
    if (mapRegionWeights.aifs) mapRegionWeights.aifs.textContent = `${regData.weights.aifs}%`;
    if (mapRegionWeights.ai) mapRegionWeights.ai.textContent = `${regData.weights.ai}%`;
    if (mapRegionWeights.ens) mapRegionWeights.ens.textContent = `${regData.weights.ensemble}%`;
  }

  regionZoneButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      selectRegion(btn.dataset.region);
    });
  });

  document.querySelectorAll(".map-region-shape").forEach(shape => {
    shape.addEventListener("click", () => {
      selectRegion(shape.dataset.region);
    });
  });

  // Select initial region (North)
  selectRegion("north");

  // Render Model Comparison Table (Demo Data)
  const comparisonTableBody = document.getElementById("landing-comparison-body");
  if (comparisonTableBody) {
    comparisonTableBody.innerHTML = "";
    BlitzCastData.comparisonMetrics.forEach(row => {
      const tr = document.createElement("tr");
      if (row.best) tr.classList.add("best");
      tr.innerHTML = `
        <td>
          <strong>${row.model}</strong>
          ${row.best ? '<span class="best-badge">★ Best Accuracy</span>' : ''}
        </td>
        <td>${row.mae}</td>
        <td>${row.rmse}</td>
        <td>${row.r2}</td>
        <td>${row.bias}</td>
      `;
      comparisonTableBody.appendChild(tr);
    });
  }

  // Render Extreme Weather Alert Cards
  const extremeAlertsContainer = document.getElementById("landing-extreme-alerts");
  if (extremeAlertsContainer) {
    extremeAlertsContainer.innerHTML = "";
    BlitzCastData.extremeAlerts.forEach(alert => {
      const card = document.createElement("div");
      card.className = "extreme-card";
      
      const isHigh = alert.severity === "High";
      const pillClass = isHigh ? "severity-high" : "severity-med";

      card.innerHTML = `
        <div class="extreme-card-top">
          <span class="severity-pill ${pillClass}">
            ${isHigh ? "⚠️ Alert" : "⚡ Watch"} · ${alert.severity}
          </span>
          <span class="card-lead-badge">Confidence: ${alert.confidence}</span>
        </div>
        <div class="extreme-title">${alert.type}</div>
        <div class="extreme-meta">
          <span>📅 ${alert.period}</span>
          <span>📍 ${alert.regionsAffected.slice(0, 2).join(", ")}</span>
        </div>
        <div class="extreme-body">${alert.explanation}</div>
      `;
      extremeAlertsContainer.appendChild(card);
    });
  }
});
