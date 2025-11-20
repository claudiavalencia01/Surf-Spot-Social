let {
  metersToFeet,
  degreesToCompassDirection,
  formatForecastDate,
  getCurrentHourIndex,
  createWeatherTile
} = wxUtils;

let UNITS = { temp: "°F", wind: "mph", waves: "m" };

let loading;
let errorMessage;
let currentWeatherGrid;
let todaySummaryGrid;
let fiveDayGrid;

let placeName;
let placeLocation;
let placeCoordinates;
let observedTime;

let useLocationButton;
let weatherSearchInput;
let weatherSearchButton;
let weatherSearchResults;

let searchDebounceTimer;

let directionRow;
let windSpeedChartContainer;
let swellHeightChartContainer;
let windSpeedChart;
let swellHeightChart;

function showLoading() {
  loading.classList.remove("hidden");
  loading.setAttribute("aria-busy", "true");
}

function hideLoading() {
  loading.classList.add("hidden");
  loading.removeAttribute("aria-busy");
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function clearError() {
  errorMessage.classList.add("hidden");
}

function clearElement(element) {
  element.textContent = "";
}

function updateHeader(place, latitude, longitude) {
  placeName.textContent = place?.name || "";

  let region = place?.region || "";
  let country = place?.country || "";
  let locText = [region, country].filter(Boolean).join(", ");
  placeLocation.textContent = locText;

  if (latitude && longitude) {
    placeCoordinates.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } else {
    placeCoordinates.textContent = "";
  }

  observedTime.textContent = "";
}

function renderCurrentWeather(weatherData) {
  clearElement(currentWeatherGrid);

  if (!weatherData?.hourly?.time?.length) {
    currentWeatherGrid.appendChild(
      createWeatherTile("Current Conditions", "—")
    );
    return;
  }

  let index = getCurrentHourIndex(weatherData.hourly.time);

  let waveMeters = weatherData.hourly.wave_height[index];
  let windWaveMeters = weatherData.hourly.wind_wave_height[index];
  let wavePeriod = weatherData.hourly.wind_wave_period[index];
  let waveDirectionDeg = weatherData.hourly.wind_wave_direction[index];

  let waveFeet = metersToFeet(waveMeters);
  let windWaveFeet = metersToFeet(windWaveMeters);
  let waveDirection = degreesToCompassDirection(waveDirectionDeg);

  let hasData = waveFeet || windWaveFeet || wavePeriod || waveDirection;

  if (!hasData) {
    currentWeatherGrid.appendChild(
      createWeatherTile("No marine data for this location.")
    );
    return;
  }

  if (waveFeet) {
    currentWeatherGrid.appendChild(createWeatherTile("Wave Height", `${waveFeet} ft`));
  }
  if (windWaveFeet) {
    currentWeatherGrid.appendChild(
      createWeatherTile("Wind-Wave Height", `${windWaveFeet} ft`)
    );
  }
  if (wavePeriod) {
    currentWeatherGrid.appendChild(createWeatherTile("Wave Period", `${wavePeriod} s`));
  }
  if (waveDirection) {
    currentWeatherGrid.appendChild(
      createWeatherTile("Wind-Wave Direction", waveDirection)
    );
  }
}

function renderTodaySummary(weatherData) {
  clearElement(todaySummaryGrid);

  if (!todaySummaryGrid) return;

  let daily = (weatherData && weatherData.daily) || {};
  let waveHeightMaxMeters = (daily.wave_height_max || [])[0];
  let windWaveHeightMaxMeters = (daily.wind_wave_height_max || [])[0];

  let waveHeightMaxFeet = metersToFeet(waveHeightMaxMeters);
  let windWaveHeightMaxFeet = metersToFeet(windWaveHeightMaxMeters);

  // If we have no daily values at all, show a simple message
  if (waveHeightMaxFeet == null && windWaveHeightMaxFeet == null) {
    todaySummaryGrid.appendChild(
      createWeatherTile("No daily summary available.")
    );
    return;
  }

  if (waveHeightMaxFeet != null) {
    todaySummaryGrid.appendChild(
      createWeatherTile("Max Wave Height", `${waveHeightMaxFeet} ft`)
    );
  }

  if (windWaveHeightMaxFeet != null) {
    todaySummaryGrid.appendChild(
      createWeatherTile("Max Wind-Wave Height", `${windWaveHeightMaxFeet} ft`)
    );
  }
}

function renderFiveDayForecast(weatherData) {
  clearElement(fiveDayGrid);

  if (!fiveDayGrid) return;

  let daily = (weatherData && weatherData.daily) || {};
  let forecastDates = daily.time || [];
  let waveHeightMaxList = daily.wave_height_max || [];
  let windWaveHeightMaxList = daily.wind_wave_height_max || [];

  if (!forecastDates.length) {
    fiveDayGrid.appendChild(
      createWeatherTile("Forecast", "No forecast data available.")
    );
    return;
  }

  let totalDays = Math.min(5, forecastDates.length);

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    let card = document.createElement("div");
    card.className = "rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-left";

    let dateLabel = document.createElement("div");
    dateLabel.className = "text-sm font-semibold text-slate-700 mb-2";
    dateLabel.textContent = formatForecastDate(forecastDates[dayIndex]);

    let waveLabel = document.createElement("p");
    waveLabel.className = "text-sm text-slate-600";
    waveLabel.textContent = "Max Wave Height";

    let waveHeightFeet = metersToFeet(waveHeightMaxList[dayIndex]);
    let waveValue = document.createElement("p");
    waveValue.className = "text-xl font-semibold text-slate-900";
    waveValue.textContent = (waveHeightFeet != null) ? `${waveHeightFeet} ft` : "—";

    let windWaveLabel = document.createElement("p");
    windWaveLabel.className = "text-sm text-slate-600 mt-2";
    windWaveLabel.textContent = "Max Wind-Wave Height";

    let windWaveHeightFeet = metersToFeet(windWaveHeightMaxList[dayIndex]);
    let windWaveValue = document.createElement("p");
    windWaveValue.className = "text-xl font-semibold text-slate-900";
    windWaveValue.textContent = (windWaveHeightFeet != null) ? `${windWaveHeightFeet} ft` : "—";

    card.appendChild(dateLabel);
    card.appendChild(waveLabel);
    card.appendChild(waveValue);
    card.appendChild(windWaveLabel);
    card.appendChild(windWaveValue);

    fiveDayGrid.appendChild(card);
  }
}

function fetchWeather(latitude, longitude) {
  let url = `/api/weather?lat=${latitude}&lon=${longitude}`;

  fetch(url)
    .then(handleWeatherResponse)
    .catch(handleWeatherError);
}

function handleWeatherResponse(response) {
  if (!response.ok) throw new Error("weather fetch failed");
  return response.json().then(renderFetchedWeather);
}

function renderFetchedWeather(data) {
  console.log("Weather API data:", data);
  hideLoading();
  renderCurrentWeather(data);
  renderTodaySummary(data);
  renderFiveDayForecast(data);
}

function handleWeatherError() {
  hideLoading();
  showError("Could not load weather data.");
}

function handleUseLocationButtonClick() {
  clearError();
  showLoading();

  if (!navigator.geolocation) {
    hideLoading();
    showError("Geolocation not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    processPositionSuccess,
    processPositionError,
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function processPositionSuccess(position) {
  let latitude = position.coords.latitude;
  let longitude = position.coords.longitude;

  updateHeader({ name: "Your Location" }, latitude, longitude);
  fetchWeather(latitude, longitude);
}

function processPositionError() {
  hideLoading();
  showError("Unable to access your location.");
}

function handleSearchInputChange() {
  let value = weatherSearchInput.value.trim();
  if (value.length < 2) {
    weatherSearchResults.classList.add("hidden");
    clearElement(weatherSearchResults);
    return;
  }

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  searchDebounceTimer = setTimeout(function () {
    fetch(`/api/geocode?q=${encodeURIComponent(value)}`)
      .then(handleGeocodeResponse)
      .catch(handleSearchError);
  }, 350);
}

function handleSearchButtonClick() {
  handleSearchInputChange();
}

function handleGeocodeResponse(response) {
  if (!response.ok) throw new Error("geocode fetch failed");
  return response.json().then(renderSearchResults);
}

function renderSearchResults(data) {
  let places = data?.results || [];
  clearElement(weatherSearchResults);

  if (!places.length) {
    weatherSearchResults.classList.add("hidden");
    return;
  }

  places.forEach(addSearchResult);
  weatherSearchResults.classList.remove("hidden");
}

function addSearchResult(place) {
  let button = document.createElement("button");
  button.className = "w-full text-left px-4 py-2 hover:bg-slate-200 text-sm";
  button.textContent = `${place.name}, ${place.region || ""}, ${place.country}`;
  button.addEventListener("click", function () {
    selectSearchResult(place);
  });
  weatherSearchResults.appendChild(button);
}

function selectSearchResult(place) {
  let label = `${place.name}, ${place.region || ""}, ${place.country || ""}`;
  weatherSearchInput.value = label;

  clearElement(weatherSearchResults);
  weatherSearchResults.classList.add("hidden");

  updateHeader(place, place.latitude, place.longitude);

  clearError();
  showLoading();
  fetchWeather(place.latitude, place.longitude);
}

function handleSearchError() {
  showError("Search failed. Try again.");
}

function initializeWeatherPage() {
  // Status
  loading = document.getElementById("loading");
  errorMessage = document.getElementById("error");

  // Sections
  currentWeatherGrid = document.getElementById("current-weather-grid");
  todaySummaryGrid = document.getElementById("today-summary");
  fiveDayGrid = document.getElementById("five-day-grid");

  // Header
  placeName = document.getElementById("place-name");
  placeLocation = document.getElementById("place-location");
  placeCoordinates = document.getElementById("place-coordinates");
  observedTime = document.getElementById("observed-time");

  // Inputs
  useLocationButton = document.getElementById("use-location-btn");
  weatherSearchInput = document.getElementById("weather-search-input");
  weatherSearchButton = document.getElementById("weather-search-btn");
  weatherSearchResults = document.getElementById("weather-search-results");

  useLocationButton.addEventListener("click", handleUseLocationButtonClick);
  weatherSearchInput.addEventListener("input", handleSearchInputChange);
  weatherSearchButton.addEventListener("click", handleSearchButtonClick);

  directionRow = document.getElementById("direction-row");
  windSpeedChartContainer = document.getElementById("wind-speed-chart-container");
  swellHeightChartContainer = document.getElementById("swell-height-chart-container");
  windSpeedChart = document.getElementById("wind-speed-chart");
  swellHeightChart = document.getElementById("swell-height-chart");

  clearError();
  hideLoading();

   // auto-load weather for current location
  handleUseLocationButtonClick();
}

window.addEventListener("DOMContentLoaded", initializeWeatherPage);
