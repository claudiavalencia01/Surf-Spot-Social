let {
  metersToFeet,
  degreesToCompassDirection,
  formatForecastDate,
  getCurrentHourIndex,
  createWeatherTile
} = wxUtils;

let UNITS = { temp: "°F", wind: "mph", waves: "m" };

// Status + sections
let loading;
let errorMessage;
let currentWeatherGrid;

// Header
let placeName;
let placeLocation;
let placeCoordinates;
let observedTime;

// Controls
let useLocationButton;
let weatherSearchInput;
let weatherSearchButton;
let weatherSearchResults;

// Debounce timer
let searchDebounceTimer;

// ========== UI Helpers ==========
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

// ========== Header Renderer ==========
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

// ========== Render Current Conditions ==========
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
      createWeatherTile("Current Conditions", "No marine data for this location.")
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

// ========== Fetch → Weather ==========
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
}

function handleWeatherError() {
  hideLoading();
  showError("Could not load weather data.");
}

// ========== Geolocation ==========
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

// ========== Search / Geocode ==========
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

// ========== INIT ==========
function initializeWeatherPage() {
  // Status
  loading = document.getElementById("loading");
  errorMessage = document.getElementById("error");

  // Sections
  currentWeatherGrid = document.getElementById("current-weather-grid");

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

  clearError();
  hideLoading();
}

window.addEventListener("DOMContentLoaded", initializeWeatherPage);
