/**
 * BlitzCast — User Forecast Dashboard Interactive Logic
 * SIH 2026: AI-Enabled Weather Forecast Blending Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  // Current dashboard state
  const state = {
    selectedLocation: "pune",
    activeVariable: "temp", // temp | rain | wind
    forecastChart: null,
    confidenceChart: null
  };

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
    updateAllChartColors();
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

  // Toast Notification System
  function showToast(message, icon = "✓") {
    let toast = document.getElementById("dashboard-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "dashboard-toast";
      toast.className = "toast-notice";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size:16px;color:var(--yellow);">${icon}</span> <span>${message}</span>`;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }

  // Weather Condition Icon Helper
  const iconMap = {
    sunny: "☀️",
    rain: "🌧️",
    partly_cloudy: "🌤️",
    cloudy: "☁️",
    storm: "⛈️",
    windy: "💨",
    hazy: "🌫️"
  };

  // Render Current Weather Card
  function renderCurrentWeather() {
    const locKey = state.selectedLocation;
    const current = BlitzCastData.currentWeather[locKey] || BlitzCastData.currentWeather["pune"];

    const heroLocation = document.getElementById("hero-region");
    const heroValue = document.getElementById("hero-value");
    const heroUnit = document.getElementById("hero-unit");
    const heroRegime = document.getElementById("hero-regime");
    const heroCondition = document.getElementById("hero-condition-text");
    const statHumidity = document.getElementById("stat-humidity");
    const statPressure = document.getElementById("stat-pressure");
    const statConfidence = document.getElementById("stat-confidence");
    const statRainProb = document.getElementById("stat-rain-prob");
    const statWind = document.getElementById("stat-wind");
    const dominantModelTag = document.getElementById("hero-dominant-model");

    if (heroLocation) heroLocation.textContent = current.location;
    if (heroValue) {
      if (state.activeVariable === "temp") {
        heroValue.textContent = current.temp.toFixed(1);
        if (heroUnit) heroUnit.textContent = "°C";
      } else if (state.activeVariable === "rain") {
        heroValue.textContent = current.rainProb;
        if (heroUnit) heroUnit.textContent = "% Prob";
      } else if (state.activeVariable === "wind") {
        heroValue.textContent = current.windSpeed.toFixed(1);
        if (heroUnit) heroUnit.textContent = "km/h";
      }
    }

    if (heroCondition) heroCondition.textContent = current.condition;
    if (heroRegime) heroRegime.textContent = `${current.regime} · ${current.season}`;
    if (statHumidity) statHumidity.textContent = `${current.humidity}%`;
    if (statPressure) statPressure.textContent = `${current.pressure} hPa`;
    if (statConfidence) statConfidence.textContent = `${current.confidence}%`;
    if (statRainProb) statRainProb.textContent = `${current.rainProb}% (${current.expectedRain} mm)`;
    if (statWind) statWind.textContent = `${current.windSpeed} km/h (${current.windDir})`;
    if (dominantModelTag) dominantModelTag.textContent = current.dominantModel;
  }

  // Render 10-Day Forecast Strip
  function renderForecastCards() {
    const strip = document.getElementById("dashboard-forecast-strip");
    if (!strip) return;

    const list = BlitzCastData.tenDayForecasts[state.selectedLocation] || BlitzCastData.tenDayForecasts["pune"];
    strip.innerHTML = "";

    list.forEach((day, index) => {
      const card = document.createElement("div");
      card.className = `forecast-day-card ${index === 0 ? "active-day" : ""}`;
      
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
      strip.appendChild(card);
    });
  }

  // Render Main Forecast Timeseries Chart
  function renderForecastChart() {
    const canvas = document.getElementById("forecast-variable-chart");
    if (!canvas || typeof Chart === "undefined") return;

    const list = BlitzCastData.tenDayForecasts[state.selectedLocation] || BlitzCastData.tenDayForecasts["pune"];
    const labels = list.map(d => `${d.day} (${d.date.split(", ")[1] || d.date})`);

    const isDark = getTheme() === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";

    let datasets = [];

    if (state.activeVariable === "temp") {
      datasets = [
        {
          label: "Blended High (°C)",
          data: list.map(d => d.tempHigh),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          borderWidth: 3,
          tension: 0.35,
          fill: "+1",
          pointRadius: 4,
          pointBackgroundColor: "#f59e0b"
        },
        {
          label: "Blended Low (°C)",
          data: list.map(d => d.tempLow),
          borderColor: "#3b82f6",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [4, 4],
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "#3b82f6"
        }
      ];
    } else if (state.activeVariable === "rain") {
      datasets = [
        {
          type: "bar",
          label: "Expected Rainfall (mm)",
          data: list.map(d => d.rainMm),
          backgroundColor: isDark ? "rgba(56, 189, 248, 0.75)" : "rgba(2, 132, 199, 0.75)",
          borderRadius: 6,
          yAxisID: "y"
        },
        {
          type: "line",
          label: "Precipitation Probability (%)",
          data: list.map(d => d.rainProb),
          borderColor: "#8b5cf6",
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#8b5cf6",
          tension: 0.3,
          yAxisID: "y1"
        }
      ];
    } else if (state.activeVariable === "wind") {
      datasets = [
        {
          type: "line",
          label: "Wind Speed (km/h)",
          data: list.map(d => d.wind),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#10b981"
        }
      ];
    }

    if (state.forecastChart) {
      state.forecastChart.destroy();
    }

    const scalesConfig = {
      x: {
        ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 } },
        grid: { display: false }
      },
      y: {
        ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 } },
        grid: { color: gridColor },
        title: {
          display: true,
          text: state.activeVariable === "temp" ? "Temperature (°C)" : (state.activeVariable === "rain" ? "Rainfall (mm)" : "Wind Speed (km/h)"),
          color: textColor,
          font: { size: 11, weight: "600" }
        }
      }
    };

    if (state.activeVariable === "rain") {
      scalesConfig.y1 = {
        position: "right",
        min: 0,
        max: 100,
        ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 }, callback: v => `${v}%` },
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Probability (%)", color: textColor, font: { size: 11, weight: "600" } }
      };
    }

    state.forecastChart = new Chart(canvas, {
      type: state.activeVariable === "rain" ? "bar" : "line",
      data: { labels, datasets },
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
        scales: scalesConfig
      }
    });
  }

  // Render 10-Day Forecast Confidence Chart
  function renderConfidenceChart() {
    const canvas = document.getElementById("confidence-trend-chart");
    if (!canvas || typeof Chart === "undefined") return;

    const data = BlitzCastData.confidenceSeries;
    const labels = data.map(d => `${d.day} (${d.leadTime})`);
    const values = data.map(d => d.pct);

    const isDark = getTheme() === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";

    if (state.confidenceChart) {
      state.confidenceChart.destroy();
    }

    state.confidenceChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Blend Confidence Score (%)",
          data: values,
          borderColor: "#f59e0b",
          backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.18)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.8,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#f59e0b"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` Confidence: ${ctx.parsed.y}% · Demo Assessment`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: "Space Grotesk", size: 10 } },
            grid: { display: false }
          },
          y: {
            min: 50,
            max: 100,
            ticks: { color: textColor, font: { family: "Space Grotesk", size: 11 }, callback: v => `${v}%` },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  function updateAllChartColors() {
    renderForecastChart();
    renderConfidenceChart();
  }

  // Location Selector Event Handler
  const locationSelect = document.getElementById("location-select");
  if (locationSelect) {
    locationSelect.addEventListener("change", (e) => {
      state.selectedLocation = e.target.value;
      renderCurrentWeather();
      renderForecastCards();
      renderForecastChart();
      renderExtremeAlerts();
      showToast(`Updated weather data for ${locationSelect.options[locationSelect.selectedIndex].text}`, "📍");
    });
  }

  // Variable Selector Tabs Event Handlers
  const targetTabs = document.querySelectorAll(".target-tab");
  targetTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      targetTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      state.activeVariable = tab.dataset.target;
      renderCurrentWeather();
      renderForecastChart();
    });
  });

  // Render Model Intelligence Weights
  function renderModelIntelligence() {
    const barsContainer = document.getElementById("dashboard-weight-bars");
    if (!barsContainer) return;

    const weights = BlitzCastData.modelWeights.current;
    barsContainer.innerHTML = "";

    const items = [
      { name: "ECMWF IFS", pct: weights.ifs, color: "#2563eb", class: "source-nwp" },
      { name: "ECMWF AIFS", pct: weights.aifs, color: "#7c3aed", class: "source-ai" },
      { name: "AI/ML Model", pct: weights.aiModel, color: "#8b5cf6", class: "source-ai" },
      { name: "Ensemble EPS", pct: weights.ensemble, color: "#059669", class: "source-ensemble" }
    ];

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "weight-row";
      row.innerHTML = `
        <div class="weight-row-head">
          <div class="weight-row-source">
            <span class="weight-source-dot" style="background-color: ${item.color}"></span>
            <span>${item.name}</span>
          </div>
          <span class="weight-row-pct">${item.pct}%</span>
        </div>
        <div class="weight-track">
          <div class="weight-fill ${item.class}" style="width: ${item.pct}%"></div>
        </div>
      `;
      barsContainer.appendChild(row);
    });
  }

  // Render Benchmark Comparison Table (Demo Data)
  function renderComparisonTable() {
    const tbody = document.getElementById("dashboard-comparison-body");
    if (!tbody) return;

    tbody.innerHTML = "";
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
      tbody.appendChild(tr);
    });
  }

  // Render Extreme Weather Alert Cards
  function renderExtremeAlerts() {
    const container = document.getElementById("dashboard-extreme-alerts");
    if (!container) return;

    container.innerHTML = "";
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
          <span>📍 ${alert.regionsAffected.join(", ")}</span>
        </div>
        <div class="extreme-body">${alert.explanation}</div>
      `;
      container.appendChild(card);
    });
  }

  // Render Regional Reliability Cards & Map
  function renderRegionalReliability() {
    const grid = document.getElementById("dashboard-region-grid");
    if (!grid) return;

    grid.innerHTML = "";
    BlitzCastData.regionalWeights.forEach(row => {
      const card = document.createElement("div");
      card.className = "region-weight-card";
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="margin:0;">${row.region}</h3>
          <span style="font-size:11px;font-weight:700;color:${row.dominantColor};">${row.dominant}</span>
        </div>
        <p style="font-size:11px;color:var(--ink-muted);margin:0 0 10px;">${row.topSkill}</p>
        <div class="mini-bar-row">
          <span class="mini-bar-label">IFS</span>
          <div class="mini-track"><div class="mini-fill" style="width:${row.weights.ifs}%; background: #2563eb"></div></div>
          <span class="mini-pct">${row.weights.ifs}%</span>
        </div>
        <div class="mini-bar-row">
          <span class="mini-bar-label">AIFS</span>
          <div class="mini-track"><div class="mini-fill" style="width:${row.weights.aifs}%; background: #7c3aed"></div></div>
          <span class="mini-pct">${row.weights.aifs}%</span>
        </div>
        <div class="mini-bar-row">
          <span class="mini-bar-label">AI</span>
          <div class="mini-track"><div class="mini-fill" style="width:${row.weights.aiModel}%; background: #8b5cf6"></div></div>
          <span class="mini-pct">${row.weights.aiModel}%</span>
        </div>
        <div class="mini-bar-row">
          <span class="mini-bar-label">Ens</span>
          <div class="mini-track"><div class="mini-fill" style="width:${row.weights.ensemble}%; background: #059669"></div></div>
          <span class="mini-pct">${row.weights.ensemble}%</span>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ============================================================
  // Subscription System Management
  // ============================================================
  const subContainer = document.getElementById("subscription-container");
  const unsubModal = document.getElementById("unsub-modal");
  const unsubReasonsGroup = document.getElementById("unsub-reasons-group");
  const otherFeedbackInput = document.getElementById("unsub-feedback-input");
  const keepSubBtn = document.getElementById("btn-keep-sub");
  const confirmUnsubBtn = document.getElementById("btn-confirm-unsub");
  const closeModalBtn = document.getElementById("btn-close-modal");

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function renderSubscriptionUI() {
    if (!subContainer) return;
    const sub = BlitzCastData.subscriptionManager.get();

    if (sub.status === "active") {
      subContainer.innerHTML = `
        <div class="sub-active-banner">
          <div class="sub-status-info">
            <span class="sub-pill-active">✓ Active Subscription</span>
            <div>
              <div class="sub-email-text">${sub.email}</div>
              <div class="sub-plan-text">10-Day Weather Updates · Extreme Weather Alerts Enabled</div>
            </div>
          </div>
          <button class="btn btn-danger-outline btn-sm" id="btn-open-unsub-modal" type="button">
            Unsubscribe
          </button>
        </div>
      `;

      document.getElementById("btn-open-unsub-modal")?.addEventListener("click", openUnsubscribeModal);
    } else if (sub.status === "unsubscribed" && sub.email) {
      subContainer.innerHTML = `
        <div class="sub-active-banner" style="background:var(--surface);">
          <div class="sub-status-info">
            <span class="sub-pill-unsubscribed">○ Unsubscribed</span>
            <div>
              <div class="sub-email-text">${sub.email}</div>
              <div class="sub-plan-text">You have been unsubscribed. You will no longer receive forecast updates or weather alerts.</div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-resubscribe" type="button">
            Resubscribe
          </button>
        </div>
      `;

      document.getElementById("btn-resubscribe")?.addEventListener("click", handleResubscribe);
    } else {
      // Default new subscriber form
      subContainer.innerHTML = `
        <div class="subscription-panel">
          <div class="sub-left">
            <span class="landing-badge">Early Forecast Dispatch</span>
            <div class="sub-title">Stay Ahead of the Weather</div>
            <div class="sub-desc">
              Subscribe to receive your personalized 10-day weather forecast and important weather alerts.
            </div>
          </div>
          <form class="sub-form" id="subscription-form">
            <div class="sub-input-wrap">
              <svg class="sub-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <input class="sub-input" id="sub-email-input" type="email" placeholder="Enter your email address" required />
            </div>
            <button class="btn btn-primary" type="submit">Subscribe</button>
          </form>
        </div>
      `;

      document.getElementById("subscription-form")?.addEventListener("submit", handleSubscribe);
    }
  }

  function handleSubscribe(e) {
    e.preventDefault();
    const input = document.getElementById("sub-email-input");
    const email = input ? input.value.trim() : "";

    if (!isValidEmail(email)) {
      showToast("Please enter a valid email address.", "⚠️");
      return;
    }

    BlitzCastData.subscriptionManager.subscribe(email);
    renderSubscriptionUI();
    showToast("You're subscribed! Your 10-day forecast updates will be sent to your registered email.", "🎉");
  }

  function handleResubscribe() {
    BlitzCastData.subscriptionManager.resubscribe();
    renderSubscriptionUI();
    showToast("You're subscribed again! Your 10-day weather forecasts and weather alerts will resume.", "🎉");
  }

  function openUnsubscribeModal() {
    if (!unsubModal) return;

    // Populate reasons
    if (unsubReasonsGroup) {
      unsubReasonsGroup.innerHTML = "";
      BlitzCastData.unsubscribeReasons.forEach((reason, i) => {
        const id = `unsub-reason-${i}`;
        const label = document.createElement("label");
        label.className = "reason-label";
        label.htmlFor = id;
        label.innerHTML = `
          <input type="radio" name="unsub-reason" id="${id}" value="${reason}">
          <span>${reason}</span>
        `;
        unsubReasonsGroup.appendChild(label);
      });
    }

    if (otherFeedbackInput) otherFeedbackInput.value = "";
    unsubModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeUnsubscribeModal() {
    if (!unsubModal) return;
    unsubModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  function handleConfirmUnsubscribe() {
    const selectedRadio = document.querySelector('input[name="unsub-reason"]:checked');
    const reason = selectedRadio ? selectedRadio.value : null;
    const feedback = otherFeedbackInput ? otherFeedbackInput.value.trim() : null;

    BlitzCastData.subscriptionManager.unsubscribe(reason, feedback);
    closeUnsubscribeModal();
    renderSubscriptionUI();
    showToast("You have been unsubscribed from weather updates.", "ℹ️");
  }

  if (keepSubBtn) keepSubBtn.addEventListener("click", closeUnsubscribeModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeUnsubscribeModal);
  if (confirmUnsubBtn) confirmUnsubBtn.addEventListener("click", handleConfirmUnsubscribe);

  // Close modal on click outside or Esc key
  if (unsubModal) {
    unsubModal.addEventListener("click", (e) => {
      if (e.target === unsubModal) closeUnsubscribeModal();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && unsubModal && unsubModal.classList.contains("open")) {
      closeUnsubscribeModal();
    }
  });

  // Initialize Dashboard Views
  renderSubscriptionUI();
  renderCurrentWeather();
  renderForecastCards();
  renderForecastChart();
  renderConfidenceChart();
  renderModelIntelligence();
  renderComparisonTable();
  renderExtremeAlerts();
  renderRegionalReliability();
});
