let {
  metersToFeet,
  degreesToCompassDirection,
  formatForecastDate,
  getCurrentHourIndex,
  createWeatherTile,
  createDirectionTile,
  renderMiniLineChart
} = wxUtils;

function build24HourWindowSeries(hourlyTime, values) {
  if (!hourlyTime || !hourlyTime.length || !values || !values.length) {
    return [];
  }

  let centerIndex = getCurrentHourIndex(hourlyTime);
  let start = Math.max(0, centerIndex - 12);
  let end = Math.min(hourlyTime.length - 1, centerIndex + 12); // inclusive

  let series = [];
  for (let i = start; i <= end; i++) {
    series.push({
      time: hourlyTime[i],
      value: values[i]
    });
  }
  return series;
}

// Main Function
function loadSpotPage() {
    let spotId = window.location.pathname.split("/").pop();

    fetch(`/api/spots/${spotId}`)
        .then(response => response.json())
        .then(data => {
            let spotInfo = data.spot || {};
            let weatherData = data.weather || {};
            let hourlyData = weatherData.hourly || {};
            let dailyData = weatherData.daily || {};

            // Spot Information
            document.getElementById("spot-name").textContent = spotInfo.name || "";

            let locationParts = [spotInfo.region, spotInfo.country].filter(Boolean);
            document.getElementById("spot-location").textContent = locationParts.join(", ");

            let latitude = Number(spotInfo.latitude);
            let longitude = Number(spotInfo.longitude);
            document.getElementById("spot-coordinates").textContent = (Number.isFinite(latitude) && Number.isFinite(longitude)) ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : "";

            // Containers
            let weatherTitle = document.getElementById("weather-section-title");
            let currentConditionsContainer = document.getElementById("current-grid");
            let todaySummaryContainer = document.getElementById("today-row");
            let forecastContainer = document.getElementById("forecast-strip");

            if (weatherTitle) weatherTitle.textContent = "Weather Conditions";
            if (currentConditionsContainer) currentConditionsContainer.textContent = "";
            if (todaySummaryContainer) todaySummaryContainer.textContent = "";
            if (forecastContainer) forecastContainer.textContent = "";

            // Current Conditions
            let currentHourIndex = getCurrentHourIndex(hourlyData.time || []);
            
            let currentWaveHeightFeet = metersToFeet((hourlyData.wave_height || [])[currentHourIndex]);
            let currentWindWaveHeightFeet = metersToFeet((hourlyData.wind_wave_height || [])[currentHourIndex]);
            let currentWavePeriodSeconds = (hourlyData.wind_wave_period || [])[currentHourIndex];
            let currentWindDirection = degreesToCompassDirection((hourlyData.wind_wave_direction || [])[currentHourIndex]);

            if (currentConditionsContainer) {
                if (currentWaveHeightFeet != null) {
                    currentConditionsContainer.appendChild(createWeatherTile("Wave Height", `${currentWaveHeightFeet} ft`));
                }
                if (currentWavePeriodSeconds != null) {
                    currentConditionsContainer.appendChild(createWeatherTile("Wave Period", `${currentWavePeriodSeconds} s`));
                }
                if (currentWindWaveHeightFeet != null) {
                    currentConditionsContainer.appendChild(createWeatherTile("Wind-Wave Height", `${currentWindWaveHeightFeet} ft`));
                }
                if (currentWindDirection) {
                    currentConditionsContainer.appendChild(createWeatherTile("Wind-Wave Direction", currentWindDirection));
                }
            }

            // Today’s Summary
            let todayMaxWaveFeet = metersToFeet((dailyData.wave_height_max || [])[0]);
            let todayMaxWindWaveFeet = metersToFeet((dailyData.wind_wave_height_max || [])[0]);

            if (todaySummaryContainer) {
                if (todayMaxWaveFeet != null) {
                    todaySummaryContainer.appendChild(createWeatherTile("Max Wave Height", `${todayMaxWaveFeet} ft`));
                }
                if (todayMaxWindWaveFeet != null) {
                    todaySummaryContainer.appendChild(createWeatherTile("Max Wind-Wave Height", `${todayMaxWindWaveFeet} ft`));
                }
            }

            // Wind and Swell Directions
            let spotDirectionRow = document.getElementById("spot-direction-row");

            if (spotDirectionRow) {
                spotDirectionRow.textContent = "";

                let currentIndex = getCurrentHourIndex(hourlyData.time || []);

                let windWaveDirDeg = (hourlyData.wind_wave_direction || [])[currentIndex];
                let swellDirDeg = (hourlyData.wave_direction || [])[currentIndex];

                let windCompass = windWaveDirDeg != null ? degreesToCompassDirection(windWaveDirDeg) : null;
                let swellCompass = swellDirDeg != null ? degreesToCompassDirection(swellDirDeg) : null;

                if (windWaveDirDeg != null) {
                    spotDirectionRow.appendChild(
                    createDirectionTile("Wind-Wave Direction", windWaveDirDeg, windCompass)
                    );
                }
                if (swellDirDeg != null) {
                    spotDirectionRow.appendChild(
                    createDirectionTile("Swell Direction", swellDirDeg, swellCompass)
                    );
                }

                if (!spotDirectionRow.hasChildNodes()) {
                    spotDirectionRow.appendChild(
                    createWeatherTile("Direction", "No direction data available.")
                    );
                }
            }
            
            let spotWindSpeedChart = document.getElementById("spot-wind-speed-chart");
            let spotSwellHeightChart = document.getElementById("spot-swell-height-chart");

            if (spotWindSpeedChart) spotWindSpeedChart.textContent = "";
            if (spotSwellHeightChart) spotSwellHeightChart.textContent = "";

            if (hourlyData.time && hourlyData.time.length) {
                let windSeries = build24HourWindowSeries(
                    hourlyData.time,
                    hourlyData.wind_wave_height || []
                );
                let swellSeries = build24HourWindowSeries(
                    hourlyData.time,
                    hourlyData.wave_height || []
                );

                renderMiniLineChart(spotWindSpeedChart, windSeries);
                renderMiniLineChart(spotSwellHeightChart, swellSeries);
            }

            // 5-Day Forecast
            if (forecastContainer) {
                let forecastDates = dailyData.time || [];
                let totalDays = Math.min(5, forecastDates.length);

                for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
                    let forecastCard = document.createElement("div");
                    forecastCard.className = "rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-left";

                    let forecastDateElement = document.createElement("div");
                    forecastDateElement.className = "text-sm font-semibold text-slate-700 mb-2";
                    forecastDateElement.textContent = formatForecastDate(forecastDates[dayIndex]);

                    let waveLabelElement = document.createElement("p");
                    waveLabelElement.className = "text-sm text-slate-600";
                    waveLabelElement.textContent = "Max Wave Height";

                    let waveHeightFeet = metersToFeet((dailyData.wave_height_max || [])[dayIndex]);
                    let waveValueElement = document.createElement("p");
                    waveValueElement.className = "text-xl font-semibold text-slate-900";
                    waveValueElement.textContent = (waveHeightFeet != null) ? `${waveHeightFeet} ft` : "—";

                    let windWaveLabelElement = document.createElement("p");
                    windWaveLabelElement.className = "text-sm text-slate-600 mt-2";
                    windWaveLabelElement.textContent = "Max Wind-Wave Height";

                    let windWaveHeightFeet = metersToFeet((dailyData.wind_wave_height_max || [])[dayIndex]);
                    let windWaveValueElement = document.createElement("p");
                    windWaveValueElement.className = "text-xl font-semibold text-slate-900";
                    windWaveValueElement.textContent = (windWaveHeightFeet != null) ? `${windWaveHeightFeet} ft` : "—";

                    forecastCard.appendChild(forecastDateElement);
                    forecastCard.appendChild(waveLabelElement);
                    forecastCard.appendChild(waveValueElement);
                    forecastCard.appendChild(windWaveLabelElement);
                    forecastCard.appendChild(windWaveValueElement);

                    forecastContainer.appendChild(forecastCard);
                }
            }

            console.log("Spot Info:", spotInfo);
            console.log("Weather Data:", weatherData);
        })
        .catch(error => {
            console.error("Error loading spot data:", error);
        });
}

// Tabs Functionality
let infoButton = document.getElementById("tab-button-info");
let postsButton = document.getElementById("tab-button-posts");
let infoPanel = document.getElementById("tab-spot-info");
let postsPanel = document.getElementById("tab-posts");

function activateTab(activeButton, inactiveButton, showPanel, hidePanel) {
    activeButton.classList.add("bg-slate-900", "text-white");
    activeButton.classList.remove("text-slate-600", "hover:bg-slate-50");
    activeButton.setAttribute("aria-selected", "true");

    inactiveButton.classList.remove("bg-slate-900", "text-white");
    inactiveButton.classList.add("text-slate-600", "hover:bg-slate-50");
    inactiveButton.setAttribute("aria-selected", "false");

    showPanel.hidden = false;
    hidePanel.hidden = true;
}

function handleInfoTabClick() {
    activateTab(infoButton, postsButton, infoPanel, postsPanel);
}

function handlePostsTabClick() {
    activateTab(postsButton, infoButton, postsPanel, infoPanel);
}

function setupTabs() {
    if (infoButton && postsButton && infoPanel && postsPanel) {
        infoButton.addEventListener("click", handleInfoTabClick);
        postsButton.addEventListener("click", handlePostsTabClick);
    }
}

function initializeSpotPage() {
    setupTabs();
    loadSpotPage();
}


window.addEventListener("DOMContentLoaded", initializeSpotPage);