// ===============================
// Global Variables
// ===============================
let pumpState = false;
let fanState = false;
let chart;

// ===============================
// DOM Elements
// ===============================
const elements = {
  pumpBtn: document.getElementById("pumpBtn"),
  pumpText: document.getElementById("pumpText"),
  pumpStatus: document.getElementById("pumpStatus"),

  fanBtn: document.getElementById("fanBtn"),
  fanText: document.getElementById("fanText"),
  fanStatus: document.getElementById("fanStatus"),

  tempValue: document.getElementById("tempValue"),
  humidityValue: document.getElementById("humidityValue"),
  soilValue: document.getElementById("soilValue"),

  tempGauge: document.getElementById("tempGauge"),
  humidityGauge: document.getElementById("humidityGauge"),
  soilGauge: document.getElementById("soilGauge"),

  statusText: document.getElementById("statusText"),
  lastUpdate: document.getElementById("lastUpdate"),
  alert: document.getElementById("alert"),
};

// ===============================
// Initialize Dashboard
// ===============================
function init() {
  setupChart();
  fetchSensorData();

  // Auto refresh every 5 seconds
  setInterval(fetchSensorData, 5000);

  showAlert("Dashboard loaded successfully!", "success");
}

// ===============================
// Setup Chart
// ===============================
function setupChart() {
  const ctx = document.getElementById("sensorChart").getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Temperature (°C)",
          data: [],
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231, 76, 60, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Humidity (%)",
          data: [],
          borderColor: "#27ae60",
          backgroundColor: "rgba(39, 174, 96, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Soil Moisture (%)",
          data: [],
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
      },
      animation: {
        duration: 500,
      },
    },
  });
}

// ===============================
// Toggle Pump
// ===============================
async function togglePump() {
  try {
    elements.pumpBtn.disabled = true;
    elements.pumpBtn.classList.add("loading");

    const newState = pumpState ? 0 : 1;
    const response = await fetch(`/pump?state=${newState}`);

    if (!response.ok) throw new Error();

    pumpState = !pumpState;
    updatePumpUI();
    showAlert(`Pump ${pumpState ? "turned ON" : "turned OFF"}`, "success");
  } catch (error) {
    console.error("Pump control error:", error);
    showAlert("Failed to control pump", "error");
  } finally {
    elements.pumpBtn.disabled = false;
    elements.pumpBtn.classList.remove("loading");
  }
}

// ===============================
// Toggle Fan
// ===============================
async function toggleFan() {
  try {
    elements.fanBtn.disabled = true;
    elements.fanBtn.classList.add("loading");

    const newState = fanState ? 0 : 1;
    const response = await fetch(`/fan?state=${newState}`);

    if (!response.ok) throw new Error();

    fanState = !fanState;
    updateFanUI();
    showAlert(`Fan ${fanState ? "turned ON" : "turned OFF"}`, "success");
  } catch (error) {
    console.error("Fan control error:", error);
    showAlert("Failed to control fan", "error");
  } finally {
    elements.fanBtn.disabled = false;
    elements.fanBtn.classList.remove("loading");
  }
}

// ===============================
// Update UI
// ===============================
function updatePumpUI() {
  if (pumpState) {
    elements.pumpText.textContent = "Pump OFF";
    elements.pumpBtn.classList.add("off");
    elements.pumpStatus.textContent = "Pump: ON";
    elements.pumpStatus.className = "status-text on";
  } else {
    elements.pumpText.textContent = "Pump ON";
    elements.pumpBtn.classList.remove("off");
    elements.pumpStatus.textContent = "Pump: OFF";
    elements.pumpStatus.className = "status-text off";
  }
}

function updateFanUI() {
  if (fanState) {
    elements.fanText.textContent = "Fan OFF";
    elements.fanBtn.classList.add("off");
    elements.fanStatus.textContent = "Fan: ON";
    elements.fanStatus.className = "status-text on";
  } else {
    elements.fanText.textContent = "Fan ON";
    elements.fanBtn.classList.remove("off");
    elements.fanStatus.textContent = "Fan: OFF";
    elements.fanStatus.className = "status-text off";
  }
}

// ===============================
// Fetch Sensor Data
// ===============================
async function fetchSensorData() {
  try {
    const response = await fetch("/data");
    if (!response.ok) throw new Error();

    const data = await response.json();

    updateSensorDisplay(data);
    updateChart(data);
    updateLastUpdateTime();
    checkAlerts(data);

    elements.statusText.textContent = "Connected";
    elements.statusText.style.color = "#27ae60";
  } catch (error) {
    console.error("Fetch error:", error);
    elements.statusText.textContent = "Connection Error";
    elements.statusText.style.color = "#e74c3c";
    showAlert("Failed to fetch sensor data", "error");
  }
}

// ===============================
// Update Sensor Display
// ===============================
function updateSensorDisplay(data) {
  elements.tempValue.textContent = Math.round(data.temperature);
  elements.humidityValue.textContent = Math.round(data.humidity);
  elements.soilValue.textContent = data.soil;

  updateGauge(elements.tempGauge, data.temperature, 50);
  updateGauge(elements.humidityGauge, data.humidity, 100);
  updateGauge(elements.soilGauge, data.soil, 100);
}

// ===============================
// Update Gauge
// ===============================
function updateGauge(gaugeElement, value, maxValue) {
  const circumference = 2 * Math.PI * 40;
  const percentage = Math.min(value / maxValue, 1);
  const offset = circumference - percentage * circumference;

  gaugeElement.style.strokeDashoffset = offset;

  if (percentage < 0.3) {
    gaugeElement.style.stroke = "#e74c3c";
  } else if (percentage > 0.7) {
    gaugeElement.style.stroke = "#27ae60";
  } else {
    gaugeElement.style.stroke = "#f39c12";
  }
}

// ===============================
// Update Chart
// ===============================
function updateChart(data) {
  const now = new Date();
  const timeLabel = formatTime(now);

  if (chart.data.labels.length >= 15) {
    chart.data.labels.shift();
    chart.data.datasets.forEach((dataset) => dataset.data.shift());
  }

  chart.data.labels.push(timeLabel);
  chart.data.datasets[0].data.push(data.temperature);
  chart.data.datasets[1].data.push(data.humidity);
  chart.data.datasets[2].data.push(data.soil);

  chart.update("none");
}

// ===============================
// Alerts & Utilities
// ===============================
function checkAlerts(data) {
  if (data.soil < 30 && !pumpState) {
    showAlert("Low soil moisture detected!", "warning");
  }

  if (data.temperature > 35) {
    showAlert("High temperature alert!", "warning");
  }

  if (data.temperature < 10) {
    showAlert("Low temperature alert!", "info");
  }
}

function updateLastUpdateTime() {
  const now = new Date();
  elements.lastUpdate.textContent = `Last update: ${formatTime(now, true)}`;
}

function formatTime(date, includeSeconds = false) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (includeSeconds) {
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${hours}:${minutes}`;
}

function showAlert(message, type = "info") {
  elements.alert.textContent = message;
  elements.alert.className = `alert ${type}`;

  setTimeout(() => {
    elements.alert.classList.add("hidden");
  }, 4000);
}

// ===============================
// Start App
// ===============================
window.addEventListener("DOMContentLoaded", init);
