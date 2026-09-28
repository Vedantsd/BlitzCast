/**
 * BlitzCast — AI-Enabled Weather Forecast Blending Platform
 * Static Mock Data & API Client Abstraction Layer
 * 
 * Smart India Hackathon 2026
 * Note: All metrics, weights, and forecast values are realistic demonstration
 * datasets structured to match future REST API contracts:
 * - GET /api/forecast
 * - GET /api/model-weights
 * - GET /api/alerts
 * - GET /api/model-comparison
 * - POST /api/subscribe
 * - POST /api/unsubscribe
 * - GET /api/subscription/status
 */

const BlitzCastData = {
  // Available demonstration locations across India
  locations: [
    { id: "pune", name: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567, region: "West" },
    { id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.0760, lon: 72.8777, region: "West" },
    { id: "delhi", name: "Delhi", state: "NCR", lat: 28.6139, lon: 77.2090, region: "North" },
    { id: "bengaluru", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946, region: "South" },
    { id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, region: "South" },
    { id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, region: "East" }
  ],

  // Current weather snapshots per location
  currentWeather: {
    pune: {
      location: "Pune, Maharashtra",
      region: "West",
      temp: 28.4,
      condition: "Partly Cloudy",
      conditionCode: "partly_cloudy",
      rainProb: 42,
      expectedRain: 6.2,
      windSpeed: 12.5,
      windDir: "WSW",
      humidity: 68,
      pressure: 1012,
      confidence: 91,
      regime: "Pre-Monsoon Convective",
      season: "Pre-Monsoon",
      airQuality: "Moderate (AQI 84)",
      dominantModel: "ECMWF AIFS (31%)",
      lastUpdated: "Just now"
    },
    mumbai: {
      location: "Mumbai, Maharashtra",
      region: "West",
      temp: 31.8,
      condition: "Humid & Hazy",
      conditionCode: "hazy",
      rainProb: 35,
      expectedRain: 2.1,
      windSpeed: 18.0,
      windDir: "WNW",
      humidity: 78,
      pressure: 1009,
      confidence: 89,
      regime: "Coastal Marine Boundary",
      season: "Pre-Monsoon",
      airQuality: "Poor (AQI 142)",
      dominantModel: "ECMWF IFS (33%)",
      lastUpdated: "Just now"
    },
    delhi: {
      location: "Delhi, NCR",
      region: "North",
      temp: 34.2,
      condition: "Hot & Clear",
      conditionCode: "sunny",
      rainProb: 15,
      expectedRain: 0.0,
      windSpeed: 14.2,
      windDir: "NW",
      humidity: 44,
      pressure: 1010,
      confidence: 94,
      regime: "Continental Dry Flow",
      season: "Summer",
      airQuality: "Severe (AQI 210)",
      dominantModel: "ECMWF AIFS (35%)",
      lastUpdated: "Just now"
    },
    bengaluru: {
      location: "Bengaluru, Karnataka",
      region: "South",
      temp: 26.1,
      condition: "Scattered Showers",
      conditionCode: "rain",
      rainProb: 65,
      expectedRain: 14.5,
      windSpeed: 16.4,
      windDir: "SW",
      humidity: 74,
      pressure: 1014,
      confidence: 88,
      regime: "Plateau Convective",
      season: "Pre-Monsoon",
      airQuality: "Good (AQI 48)",
      dominantModel: "Ensemble EPS (29%)",
      lastUpdated: "Just now"
    },
    chennai: {
      location: "Chennai, Tamil Nadu",
      region: "South",
      temp: 32.5,
      condition: "Sunny & Breezy",
      conditionCode: "sunny",
      rainProb: 20,
      expectedRain: 0.8,
      windSpeed: 21.0,
      windDir: "SE",
      humidity: 72,
      pressure: 1011,
      confidence: 92,
      regime: "Maritime Coastal",
      season: "Summer",
      airQuality: "Moderate (AQI 78)",
      dominantModel: "ECMWF IFS (32%)",
      lastUpdated: "Just now"
    },
    kolkata: {
      location: "Kolkata, West Bengal",
      region: "East",
      temp: 30.2,
      condition: "Thunderstorm Risk",
      conditionCode: "storm",
      rainProb: 78,
      expectedRain: 22.0,
      windSpeed: 24.5,
      windDir: "S",
      humidity: 82,
      pressure: 1007,
      confidence: 86,
      regime: "Nor'wester Convective",
      season: "Pre-Monsoon",
      airQuality: "Moderate (AQI 95)",
      dominantModel: "Ensemble EPS (33%)",
      lastUpdated: "Just now"
    }
  },

  // 10-day forecast series per location
  tenDayForecasts: {
    pune: [
      { day: "Today", date: "Mon, 28 Sep", tempHigh: 29, tempLow: 21, rainProb: 42, rainMm: 6.2, wind: 13, condition: "Partly Cloudy", icon: "partly_cloudy", regime: "Convective" },
      { day: "Tue", date: "29 Sep", tempHigh: 28, tempLow: 20, rainProb: 72, rainMm: 18.4, wind: 16, condition: "Heavy Rain", icon: "rain", regime: "Monsoon Surge" },
      { day: "Wed", date: "30 Sep", tempHigh: 27, tempLow: 19, rainProb: 65, rainMm: 14.1, wind: 15, condition: "Moderate Rain", icon: "rain", regime: "Monsoon Surge" },
      { day: "Thu", date: "01 Oct", tempHigh: 29, tempLow: 20, rainProb: 38, rainMm: 4.0, wind: 12, condition: "Scattered Clouds", icon: "cloudy", regime: "Transitional" },
      { day: "Fri", date: "02 Oct", tempHigh: 30, tempLow: 21, rainProb: 24, rainMm: 1.5, wind: 11, condition: "Partly Cloudy", icon: "partly_cloudy", regime: "Dry Spell" },
      { day: "Sat", date: "03 Oct", tempHigh: 32, tempLow: 22, rainProb: 18, rainMm: 0.0, wind: 10, condition: "Sunny & Warm", icon: "sunny", regime: "Heat Build-up" },
      { day: "Sun", date: "04 Oct", tempHigh: 33, tempLow: 22, rainProb: 20, rainMm: 0.2, wind: 12, condition: "High Sun", icon: "sunny", regime: "Heat Wave Risk" },
      { day: "Mon", date: "05 Oct", tempHigh: 31, tempLow: 21, rainProb: 48, rainMm: 8.5, wind: 18, condition: "Thunderstorms", icon: "storm", regime: "High Convection" },
      { day: "Tue", date: "06 Oct", tempHigh: 29, tempLow: 20, rainProb: 55, rainMm: 11.0, wind: 22, condition: "Windy & Showers", icon: "windy", regime: "Wind Gradient" },
      { day: "Wed", date: "07 Oct", tempHigh: 28, tempLow: 19, rainProb: 30, rainMm: 2.8, wind: 14, condition: "Clearing Sky", icon: "partly_cloudy", regime: "Post-Storm" }
    ],
    mumbai: [
      { day: "Today", date: "Mon, 28 Sep", tempHigh: 32, tempLow: 26, rainProb: 35, rainMm: 2.1, wind: 18, condition: "Humid & Hazy", icon: "hazy", regime: "Coastal" },
      { day: "Tue", date: "29 Sep", tempHigh: 31, tempLow: 25, rainProb: 68, rainMm: 24.0, wind: 24, condition: "Heavy Coastal Rain", icon: "rain", regime: "Offshore Trough" },
      { day: "Wed", date: "30 Sep", tempHigh: 30, tempLow: 25, rainProb: 75, rainMm: 32.5, wind: 26, condition: "Squally Showers", icon: "storm", regime: "Offshore Trough" },
      { day: "Thu", date: "01 Oct", tempHigh: 31, tempLow: 26, rainProb: 45, rainMm: 8.0, wind: 19, condition: "Passing Showers", icon: "rain", regime: "Weak Trough" },
      { day: "Fri", date: "02 Oct", tempHigh: 32, tempLow: 26, rainProb: 25, rainMm: 1.0, wind: 15, condition: "Warm & Humid", icon: "partly_cloudy", regime: "Marine" },
      { day: "Sat", date: "03 Oct", tempHigh: 33, tempLow: 27, rainProb: 20, rainMm: 0.0, wind: 14, condition: "Hazy Sun", icon: "sunny", regime: "Dry Coastal" },
      { day: "Sun", date: "04 Oct", tempHigh: 34, tempLow: 27, rainProb: 15, rainMm: 0.0, wind: 13, condition: "Warm Breeze", icon: "sunny", regime: "Dry Coastal" },
      { day: "Mon", date: "05 Oct", tempHigh: 32, tempLow: 26, rainProb: 40, rainMm: 5.5, wind: 17, condition: "Breezy Showers", icon: "rain", regime: "Wind Shift" },
      { day: "Tue", date: "06 Oct", tempHigh: 31, tempLow: 25, rainProb: 50, rainMm: 9.2, wind: 21, condition: "Gusty Clouds", icon: "windy", regime: "Wind Shift" },
      { day: "Wed", date: "07 Oct", tempHigh: 32, tempLow: 26, rainProb: 28, rainMm: 2.0, wind: 16, condition: "Partly Cloudy", icon: "partly_cloudy", regime: "Fair" }
    ],
    delhi: [
      { day: "Today", date: "Mon, 28 Sep", tempHigh: 35, tempLow: 23, rainProb: 15, rainMm: 0.0, wind: 14, condition: "Hot & Clear", icon: "sunny", regime: "Dry Plain" },
      { day: "Tue", date: "29 Sep", tempHigh: 36, tempLow: 24, rainProb: 10, rainMm: 0.0, wind: 16, condition: "Intense Heat", icon: "sunny", regime: "Heatwave" },
      { day: "Wed", date: "30 Sep", tempHigh: 36, tempLow: 24, rainProb: 12, rainMm: 0.0, wind: 15, condition: "Sunny & Dry", icon: "sunny", regime: "Heatwave" },
      { day: "Thu", date: "01 Oct", tempHigh: 34, tempLow: 22, rainProb: 30, rainMm: 2.5, wind: 20, condition: "Dust Storm Risk", icon: "windy", regime: "Western Disturbance" },
      { day: "Fri", date: "02 Oct", tempHigh: 32, tempLow: 21, rainProb: 45, rainMm: 6.0, wind: 18, condition: "Thunder Showers", icon: "storm", regime: "Western Disturbance" },
      { day: "Sat", date: "03 Oct", tempHigh: 33, tempLow: 21, rainProb: 20, rainMm: 0.5, wind: 13, condition: "Breezy Clouds", icon: "partly_cloudy", regime: "Transitional" },
      { day: "Sun", date: "04 Oct", tempHigh: 34, tempLow: 22, rainProb: 10, rainMm: 0.0, wind: 12, condition: "Clear Sky", icon: "sunny", regime: "Dry Flow" },
      { day: "Mon", date: "05 Oct", tempHigh: 35, tempLow: 23, rainProb: 10, rainMm: 0.0, wind: 14, condition: "Warm Sunshine", icon: "sunny", regime: "Dry Flow" },
      { day: "Tue", date: "06 Oct", tempHigh: 34, tempLow: 22, rainProb: 18, rainMm: 0.0, wind: 15, condition: "Scattered High Clouds", icon: "cloudy", regime: "Fair" },
      { day: "Wed", date: "07 Oct", tempHigh: 33, tempLow: 21, rainProb: 22, rainMm: 1.0, wind: 13, condition: "Pleasant", icon: "partly_cloudy", regime: "Autumn Transition" }
    ],
    bengaluru: [
      { day: "Today", date: "Mon, 28 Sep", tempHigh: 27, tempLow: 19, rainProb: 65, rainMm: 14.5, wind: 16, condition: "Showers & Clouds", icon: "rain", regime: "Plateau Convective" },
      { day: "Tue", date: "29 Sep", tempHigh: 26, tempLow: 18, rainProb: 70, rainMm: 18.0, wind: 18, condition: "Thunderstorm", icon: "storm", regime: "Shear Zone" },
      { day: "Wed", date: "30 Sep", tempHigh: 26, tempLow: 18, rainProb: 60, rainMm: 12.0, wind: 15, condition: "Rain Showers", icon: "rain", regime: "Shear Zone" },
      { day: "Thu", date: "01 Oct", tempHigh: 27, tempLow: 19, rainProb: 40, rainMm: 4.5, wind: 14, condition: "Passing Showers", icon: "partly_cloudy", regime: "Weak Shear" },
      { day: "Fri", date: "02 Oct", tempHigh: 28, tempLow: 19, rainProb: 30, rainMm: 2.0, wind: 13, condition: "Pleasant & Breezy", icon: "partly_cloudy", regime: "Plateau Fair" },
      { day: "Sat", date: "03 Oct", tempHigh: 29, tempLow: 20, rainProb: 25, rainMm: 1.0, wind: 12, condition: "Partly Sunny", icon: "sunny", regime: "Dry Interval" },
      { day: "Sun", date: "04 Oct", tempHigh: 28, tempLow: 19, rainProb: 35, rainMm: 3.2, wind: 15, condition: "Afternoon Drizzle", icon: "rain", regime: "Local Thermal" },
      { day: "Mon", date: "05 Oct", tempHigh: 27, tempLow: 19, rainProb: 50, rainMm: 7.8, wind: 17, condition: "Evening Storm", icon: "storm", regime: "Convective" },
      { day: "Tue", date: "06 Oct", tempHigh: 27, tempLow: 18, rainProb: 45, rainMm: 5.0, wind: 16, condition: "Cloudy & Showers", icon: "rain", regime: "Convective" },
      { day: "Wed", date: "07 Oct", tempHigh: 28, tempLow: 19, rainProb: 30, rainMm: 1.8, wind: 14, condition: "Cool Breeze", icon: "partly_cloudy", regime: "Fair" }
    ],
    chennai: [
      { day: "Today", date: "Mon, 28 Sep", tempHigh: 33, tempLow: 25, rainProb: 20, rainMm: 0.8, wind: 21, condition: "Sunny & Breezy", icon: "sunny", regime: "Maritime" },
      { day: "Tue", date: "29 Sep", tempHigh: 34, tempLow: 26, rainProb: 25, rainMm: 1.2, wind: 19, condition: "Warm & Sunny", icon: "sunny", regime: "Thermal High" },
      { day: "Wed", date: "30 Sep", tempHigh: 33, tempLow: 25, rainProb: 30, rainMm: 3.0, wind: 22, condition: "Coast Cloudiness", icon: "partly_cloudy", regime: "Sea Breeze" },
      { day: "Thu", date: "01 Oct", tempHigh: 32, tempLow: 25, rainProb: 40, rainMm: 6.5, wind: 24, condition: "Afternoon Showers", icon: "rain", regime: "Low Pressure Trough" },
      { day: "Fri", date: "02 Oct", tempHigh: 31, tempLow: 24, rainProb: 60, rainMm: 15.0, wind: 28, condition: "Coastal Thunderstorms", icon: "storm", regime: "Bay Disturbance" },
      { day: "Sat", date: "03 Oct", tempHigh: 31, tempLow: 24, rainProb: 55, rainMm: 12.0, wind: 25, condition: "Squally Showers", icon: "storm", regime: "Bay Disturbance" },
      { day: "Sun", date: "04 Oct", tempHigh: 32, tempLow: 25, rainProb: 35, rainMm: 4.0, wind: 20, condition: "Breezy & Cloudy", icon: "windy", regime: "Trough Decay" },
      { day: "Mon", date: "05 Oct", tempHigh: 33, tempLow: 26, rainProb: 25, rainMm: 1.5, wind: 18, condition: "Sun & Clouds", icon: "partly_cloudy", regime: "Maritime Fair" },
      { day: "Tue", date: "06 Oct", tempHigh: 34, tempLow: 26, rainProb: 15, rainMm: 0.2, wind: 17, condition: "Hot & Clear", icon: "sunny", regime: "Maritime Fair" },
      { day: "Wed", date: "07 Oct", tempHigh: 33, tempLow: 25, rainProb: 20, rainMm: 0.5, wind: 19, condition: "Moderate Wind", icon: "partly_cloudy", regime: "Fair" }
    ],
    kolkata: [
      { day: "Today", date: "Mon, 28 Sep", tempHigh: 31, tempLow: 24, rainProb: 78, rainMm: 22.0, wind: 25, condition: "Thunderstorm Risk", icon: "storm", regime: "Nor'wester" },
      { day: "Tue", date: "29 Sep", tempHigh: 30, tempLow: 23, rainProb: 82, rainMm: 34.0, wind: 28, condition: "Severe Thunderstorm", icon: "storm", regime: "Nor'wester" },
      { day: "Wed", date: "30 Sep", tempHigh: 29, tempLow: 23, rainProb: 70, rainMm: 19.5, wind: 22, condition: "Continuous Rain", icon: "rain", regime: "Cyclonic Eddy" },
      { day: "Thu", date: "01 Oct", tempHigh: 31, tempLow: 24, rainProb: 50, rainMm: 8.0, wind: 18, condition: "Passing Showers", icon: "rain", regime: "Depression Tail" },
      { day: "Fri", date: "02 Oct", tempHigh: 32, tempLow: 25, rainProb: 35, rainMm: 3.5, wind: 15, condition: "Humid & Sun", icon: "partly_cloudy", regime: "Transitional" },
      { day: "Sat", date: "03 Oct", tempHigh: 33, tempLow: 25, rainProb: 25, rainMm: 1.0, wind: 13, condition: "Warm & Hazy", icon: "hazy", regime: "Dry Eddy" },
      { day: "Sun", date: "04 Oct", tempHigh: 33, tempLow: 26, rainProb: 30, rainMm: 2.0, wind: 14, condition: "Scattered Clouds", icon: "cloudy", regime: "Bay Flow" },
      { day: "Mon", date: "05 Oct", tempHigh: 32, tempLow: 25, rainProb: 45, rainMm: 6.5, wind: 17, condition: "Afternoon Storm", icon: "storm", regime: "Convective" },
      { day: "Tue", date: "06 Oct", tempHigh: 31, tempLow: 24, rainProb: 55, rainMm: 11.2, wind: 20, condition: "Wet & Windy", icon: "windy", regime: "Convective" },
      { day: "Wed", date: "07 Oct", tempHigh: 32, tempLow: 25, rainProb: 30, rainMm: 2.4, wind: 16, condition: "Sun Breaking Through", icon: "partly_cloudy", regime: "Fair" }
    ]
  },

  // 10-day forecast confidence progression (Demonstration values)
  confidenceSeries: [
    { day: "Day 1", pct: 95, leadTime: "0–24h", label: "Very High" },
    { day: "Day 2", pct: 93, leadTime: "24–48h", label: "Very High" },
    { day: "Day 3", pct: 90, leadTime: "48–72h", label: "High" },
    { day: "Day 4", pct: 87, leadTime: "Day 4", label: "High" },
    { day: "Day 5", pct: 84, leadTime: "Day 5", label: "High" },
    { day: "Day 6", pct: 80, leadTime: "Day 6", label: "Moderate" },
    { day: "Day 7", pct: 76, leadTime: "Day 7", label: "Moderate" },
    { day: "Day 8", pct: 72, leadTime: "Day 8", label: "Moderate" },
    { day: "Day 9", pct: 68, leadTime: "Day 9", label: "Indicative" },
    { day: "Day 10", pct: 64, leadTime: "Day 10", label: "Indicative" }
  ],

  // Model weights data: dynamic adaptation by lead time and regime
  modelWeights: {
    current: {
      ifs: 24,
      aifs: 31,
      aiModel: 22,
      ensemble: 23,
      dominant: "ECMWF AIFS",
      rationale: "AIFS displays superior skill in 48-120h mid-tropospheric pattern recognition for current convective regime."
    },
    byLeadTime: [
      { range: "Day 1–2 (0–48h)", ifs: 34, aifs: 28, aiModel: 18, ensemble: 20, primary: "ECMWF IFS (Physics-bound boundary layer)" },
      { range: "Day 3–5 (48–120h)", ifs: 22, aifs: 35, aiModel: 23, ensemble: 20, primary: "ECMWF AIFS (Optimal synoptic pattern skill)" },
      { range: "Day 6–7 (120–168h)", ifs: 18, aifs: 28, aiModel: 25, ensemble: 29, primary: "Ensemble EPS (Spreads uncertainty effectively)" },
      { range: "Day 8–10 (168–240h)", ifs: 14, aifs: 22, aiModel: 24, ensemble: 40, primary: "Ensemble EPS (Governs long-range regime probabilities)" }
    ]
  },

  // Regional model reliability map across India
  regionalWeights: [
    {
      region: "North India",
      code: "north",
      dominant: "AIFS",
      dominantColor: "#8b5cf6",
      dominantFullName: "ECMWF AIFS",
      topSkill: "Western Disturbances & Cold Advection",
      weights: { ifs: 28, aifs: 34, aiModel: 20, ensemble: 18 },
      rationale: "AI synoptic models resolve mid-latitude trough propagation over the Himalayas with reduced orographic bias."
    },
    {
      region: "West India",
      code: "west",
      dominant: "AIFS",
      dominantColor: "#8b5cf6",
      dominantFullName: "ECMWF AIFS",
      topSkill: "Offshore Trough & Coastal Lows",
      weights: { ifs: 22, aifs: 31, aiModel: 24, ensemble: 23 },
      rationale: "Dynamic combination of AIFS for 72h timing and IFS for marine boundary layer stability."
    },
    {
      region: "Central India",
      code: "central",
      dominant: "Ensemble",
      dominantColor: "#10b981",
      dominantFullName: "Ensemble EPS",
      topSkill: "Monsoon Core Zone & Rain Spreads",
      weights: { ifs: 20, aifs: 24, aiModel: 22, ensemble: 34 },
      rationale: "High convective variance across Central India demands multi-member ensemble weighting to quantify tail risks."
    },
    {
      region: "East & North-East",
      code: "east",
      dominant: "Ensemble",
      dominantColor: "#10b981",
      dominantFullName: "Ensemble EPS",
      topSkill: "Nor'westers & Bay Cyclogenesis",
      weights: { ifs: 24, aifs: 21, aiModel: 21, ensemble: 34 },
      rationale: "Rapid cyclogenesis and severe thunderstorms in the Bay of Bengal benefit from ensemble probability density."
    },
    {
      region: "South India",
      code: "south",
      dominant: "IFS",
      dominantColor: "#3b82f6",
      dominantFullName: "ECMWF IFS",
      topSkill: "Orographic Ghats Rainfall & Trade Winds",
      weights: { ifs: 33, aifs: 27, aiModel: 21, ensemble: 19 },
      rationale: "High-resolution physical equations excel at resolving complex Western Ghats rainfall and peninsula wind shear."
    }
  ],

  // Model comparison benchmark (Demo / Illustrative data)
  comparisonMetrics: [
    { model: "NWP (Physical IFS)", mae: 1.82, rmse: 2.41, r2: 0.81, bias: "+0.32", best: false },
    { model: "AI/ML (Graph/AIFS)", mae: 1.64, rmse: 2.18, r2: 0.86, bias: "-0.15", best: false },
    { model: "Ensemble Mean (EPS)", mae: 1.58, rmse: 2.09, r2: 0.87, bias: "+0.08", best: false },
    { model: "BlitzCast Weighted Blend", mae: 1.29, rmse: 1.74, r2: 0.92, bias: "+0.02", best: true },
    { model: "BlitzCast AI Adaptive", mae: 1.21, rmse: 1.68, r2: 0.94, bias: "-0.01", best: true }
  ],

  // Active extreme weather guidance & early alerts (Demo)
  extremeAlerts: [
    {
      id: "alert-rain-1",
      type: "Heavy Rainfall",
      code: "rain",
      severity: "High",
      severityColor: "#ef4444",
      period: "Next 24–48 hours",
      confidence: "87%",
      headline: "Localized torrential precipitation exceeding 65 mm/24h",
      explanation: "Hybrid blend detected strong convergence between offshore westerly flow and western ghats escarpment. Peak rainfall expected Tuesday night.",
      regionsAffected: ["Pune Ghats", "Raigad", "Ratnagiri", "Mumbai Suburbs"]
    },
    {
      id: "alert-heat-2",
      type: "Heat Wave Risk",
      code: "heat",
      severity: "Medium",
      severityColor: "#f59e0b",
      period: "Day 5–7 (02–04 Oct)",
      confidence: "72%",
      headline: "Afternoon temperature anomaly +3.8°C above seasonal normal",
      explanation: "Prolonged dry advection from northwest arid corridor with clear skies. Recommended precautions for agricultural irrigation and outdoor activity.",
      regionsAffected: ["Delhi NCR", "North Rajasthan", "Western UP"]
    },
    {
      id: "alert-wind-3",
      type: "High-Wind Event",
      code: "wind",
      severity: "Moderate",
      severityColor: "#3b82f6",
      period: "Day 8 (05 Oct)",
      confidence: "68%",
      headline: "Surface wind gusts reaching 45–55 km/h",
      explanation: "Steep baroclinic pressure gradient forming along coastal corridor during evening storm transition.",
      regionsAffected: ["Coastal Konkan", "North Bay Coast", "Kolkata Peri-urban"]
    }
  ],

  // Unsubscribe reasons for user dashboard feedback
  unsubscribeReasons: [
    "Too many emails",
    "Forecasts are not relevant to me",
    "I no longer need weather updates",
    "I prefer another weather service",
    "Privacy concerns",
    "Other"
  ],

  // Subscription state management in localStorage
  subscriptionManager: {
    STORAGE_KEY: "blitzcast_user_subscription",
    
    get() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.error("Subscription read error:", e);
      }
      return {
        status: "unsubscribed", // default initial state
        email: "",
        subscribedAt: null,
        frequency: "10-Day Weather Updates",
        alertsEnabled: true,
        unsubscribeReason: null,
        otherFeedback: null
      };
    },

    subscribe(email) {
      const state = {
        status: "active",
        email: email.trim().toLowerCase(),
        subscribedAt: new Date().toISOString(),
        frequency: "10-Day Weather Updates",
        alertsEnabled: true,
        unsubscribeReason: null,
        otherFeedback: null
      };
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
      return state;
    },

    unsubscribe(reason = null, feedback = null) {
      const existing = this.get();
      const state = {
        ...existing,
        status: "unsubscribed",
        unsubscribeReason: reason,
        otherFeedback: feedback,
        unsubscribedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
      return state;
    },

    resubscribe() {
      const existing = this.get();
      const state = {
        ...existing,
        status: "active",
        subscribedAt: new Date().toISOString(),
        unsubscribedAt: null,
        unsubscribeReason: null,
        otherFeedback: null
      };
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
      return state;
    }
  }
};

// Export to window object for browser access
if (typeof window !== "undefined") {
  window.BlitzCastData = BlitzCastData;
}
