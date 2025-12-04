// app/public/js/spot.js

let {
    metersToFeet,
    degreesToCompassDirection,
    formatForecastDate,
    getCurrentHourIndex,
    createWeatherTile,
    createDirectionTile,
    renderMiniLineChart,
  } = wxUtils;
  
  let currentUser = null;
  let currentSpotId = null;
  
  async function loadCurrentUser() {
    try {
      const res = await fetch("/me");
      const data = await res.json();
      currentUser = data.user || null;
    } catch (e) {
      currentUser = null;
    }
  }
  
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
        value: values[i],
      });
    }
    return series;
  }
  
  // -----------------------------
  // MAIN SPOT + WEATHER LOADER
  // -----------------------------
  async function loadSpotPage() {
    let spotId = window.location.pathname.split("/").pop();
    currentSpotId = spotId;
  
    try {
      const response = await fetch(`/api/spots/${spotId}`);
      const data = await response.json();
  
      let spotInfo = data.spot || {};
      let weatherData = data.weather || {};
      let hourlyData = weatherData.hourly || {};
      let dailyData = weatherData.daily || {};
  
      // Spot header
      document.getElementById("spot-name").textContent = spotInfo.name || "";
  
      let locationParts = [spotInfo.region, spotInfo.country].filter(Boolean);
      document.getElementById("spot-location").textContent =
        locationParts.join(", ");
  
      let latitude = Number(spotInfo.latitude);
      let longitude = Number(spotInfo.longitude);
      document.getElementById("spot-coordinates").textContent =
        Number.isFinite(latitude) && Number.isFinite(longitude)
          ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          : "";
  
      // WEATHER UI containers
      let weatherTitle = document.getElementById("weather-section-title");
      let currentConditionsContainer = document.getElementById("current-grid");
      let todaySummaryContainer = document.getElementById("today-row");
      let forecastContainer = document.getElementById("forecast-strip");
  
      if (weatherTitle) weatherTitle.textContent = "Weather Conditions";
      if (currentConditionsContainer) currentConditionsContainer.textContent = "";
      if (todaySummaryContainer) todaySummaryContainer.textContent = "";
      if (forecastContainer) forecastContainer.textContent = "";
  
      // Current conditions
      let currentHourIndex = getCurrentHourIndex(hourlyData.time || []);
  
      let currentWaveHeightFeet = metersToFeet(
        (hourlyData.wave_height || [])[currentHourIndex]
      );
      let currentWindWaveHeightFeet = metersToFeet(
        (hourlyData.wind_wave_height || [])[currentHourIndex]
      );
      let currentWavePeriodSeconds = (hourlyData.wind_wave_period || [])[
        currentHourIndex
      ];
      let currentWindDirection = degreesToCompassDirection(
        (hourlyData.wind_wave_direction || [])[currentHourIndex]
      );
  
      if (currentConditionsContainer) {
        if (currentWaveHeightFeet != null) {
          currentConditionsContainer.appendChild(
            createWeatherTile("Wave Height", `${currentWaveHeightFeet} ft`)
          );
        }
        if (currentWavePeriodSeconds != null) {
          currentConditionsContainer.appendChild(
            createWeatherTile("Wave Period", `${currentWavePeriodSeconds} s`)
          );
        }
        if (currentWindWaveHeightFeet != null) {
          currentConditionsContainer.appendChild(
            createWeatherTile(
              "Wind-Wave Height",
              `${currentWindWaveHeightFeet} ft`
            )
          );
        }
        if (currentWindDirection) {
          currentConditionsContainer.appendChild(
            createWeatherTile("Wind-Wave Direction", currentWindDirection)
          );
        }
      }
  
      // Today summary
      let todayMaxWaveFeet = metersToFeet(
        (dailyData.wave_height_max || [])[0]
      );
      let todayMaxWindWaveFeet = metersToFeet(
        (dailyData.wind_wave_height_max || [])[0]
      );
  
      if (todaySummaryContainer) {
        if (todayMaxWaveFeet != null) {
          todaySummaryContainer.appendChild(
            createWeatherTile("Max Wave Height", `${todayMaxWaveFeet} ft`)
          );
        }
        if (todayMaxWindWaveFeet != null) {
          todaySummaryContainer.appendChild(
            createWeatherTile(
              "Max Wind-Wave Height",
              `${todayMaxWindWaveFeet} ft`
            )
          );
        }
      }
  
      // Wind & swell direction
      let spotDirectionRow = document.getElementById("spot-direction-row");
  
      if (spotDirectionRow) {
        spotDirectionRow.textContent = "";
  
        let currentIndex = getCurrentHourIndex(hourlyData.time || []);
  
        let windWaveDirDeg = (hourlyData.wind_wave_direction || [])[currentIndex];
        let swellDirDeg = (hourlyData.wave_direction || [])[currentIndex];
  
        let windCompass =
          windWaveDirDeg != null
            ? degreesToCompassDirection(windWaveDirDeg)
            : null;
        let swellCompass =
          swellDirDeg != null ? degreesToCompassDirection(swellDirDeg) : null;
  
        if (windWaveDirDeg != null) {
          spotDirectionRow.appendChild(
            createDirectionTile(
              "Wind-Wave Direction",
              windWaveDirDeg,
              windCompass
            )
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
  
      // SMALL CHARTS
      let spotWindSpeedChart = document.getElementById("spot-wind-speed-chart");
      let spotSwellHeightChart = document.getElementById(
        "spot-swell-height-chart"
      );
  
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
  
      // 5-day forecast
      if (forecastContainer) {
        let forecastDates = dailyData.time || [];
        let totalDays = Math.min(5, forecastDates.length);
  
        for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
          let forecastCard = document.createElement("div");
          forecastCard.className =
            "rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-left";
  
          let forecastDateElement = document.createElement("div");
          forecastDateElement.className =
            "text-sm font-semibold text-slate-700 mb-2";
          forecastDateElement.textContent = formatForecastDate(
            forecastDates[dayIndex]
          );
  
          let waveLabelElement = document.createElement("p");
          waveLabelElement.className = "text-sm text-slate-600";
          waveLabelElement.textContent = "Max Wave Height";
  
          let waveHeightFeet = metersToFeet(
            (dailyData.wave_height_max || [])[dayIndex]
          );
          let waveValueElement = document.createElement("p");
          waveValueElement.className =
            "text-xl font-semibold text-slate-900";
          waveValueElement.textContent =
            waveHeightFeet != null ? `${waveHeightFeet} ft` : "—";
  
          let windWaveLabelElement = document.createElement("p");
          windWaveLabelElement.className =
            "text-sm text-slate-600 mt-2";
          windWaveLabelElement.textContent = "Max Wind-Wave Height";
  
          let windWaveHeightFeet = metersToFeet(
            (dailyData.wind_wave_height_max || [])[dayIndex]
          );
          let windWaveValueElement = document.createElement("p");
          windWaveValueElement.className =
            "text-xl font-semibold text-slate-900";
          windWaveValueElement.textContent =
            windWaveHeightFeet != null ? `${windWaveHeightFeet} ft` : "—";
  
          forecastCard.appendChild(forecastDateElement);
          forecastCard.appendChild(waveLabelElement);
          forecastCard.appendChild(waveValueElement);
          forecastCard.appendChild(windWaveLabelElement);
          forecastCard.appendChild(windWaveValueElement);
  
          forecastContainer.appendChild(forecastCard);
        }
      }
  
      // ----- TIPS -----
      setupCreatorTip(spotInfo);
      await loadSpotTips(spotInfo.id);
  
      console.log("Spot Info:", spotInfo);
      console.log("Weather Data:", weatherData);
      } catch (e) {
    console.error("loadSpotTips error", e);
    // Don't show an error message in the UI — just fall back to the empty state
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
  }

  }
  
  // -----------------------------
  // TIPS UI
  // -----------------------------
  function setupTipsAuthState() {
    const textarea = document.getElementById("new-tip");
    const button = document.getElementById("submit-tip");
    const hint = document.getElementById("tips-login-hint");
  
    if (!textarea || !button || !hint) return;
  
    if (!currentUser) {
      textarea.disabled = true;
      button.disabled = true;
      hint.classList.remove("hidden");
    } else {
      textarea.disabled = false;
      button.disabled = false;
      hint.classList.add("hidden");
    }
  }
  
  function setupCreatorTip(spotInfo) {
    const creatorTipEl = document.getElementById("spot-creator-tip");
    if (!creatorTipEl) return;
  
    const desc = (spotInfo.description || "").trim();
    if (!desc) {
      creatorTipEl.classList.add("hidden");
      creatorTipEl.textContent = "";
      return;
    }
  
    creatorTipEl.classList.remove("hidden");
    creatorTipEl.innerHTML = `
      <p class="text-xs uppercase tracking-wide text-slate-500 mb-1">Original tip</p>
      <p class="text-sm text-slate-800">${desc}</p>
    `;
  }
  
  async function loadSpotTips(spotId) {
    const listEl = document.getElementById("tips-list");
    const emptyEl = document.getElementById("tips-empty");
    if (!listEl || !emptyEl || !spotId) return;
  
    listEl.innerHTML =
      '<p class="text-sm text-slate-500">Loading tips...</p>';
  
    try {
      const res = await fetch(`/api/spot-tips/${spotId}`);
      const tips = await res.json();
  
      if (!Array.isArray(tips) || !tips.length) {
        listEl.innerHTML = "";
        emptyEl.classList.remove("hidden");
        return;
      }
  
      emptyEl.classList.add("hidden");
      listEl.innerHTML = "";
  
      tips.forEach((t) => {
        const item = document.createElement("div");
        item.className =
          "rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm flex justify-between gap-3";
  
        const left = document.createElement("div");
        left.innerHTML = `
          <p class="text-slate-800">
            <span class="font-semibold">${t.username}</span>
            <span class="ml-1">${t.content}</span>
          </p>
          <p class="text-xs text-slate-500">${new Date(
            t.created_at
          ).toLocaleString()}</p>
        `;
  
        item.appendChild(left);
  
        if (currentUser && currentUser.user_id === t.user_id) {
          const delBtn = document.createElement("button");
          delBtn.textContent = "Delete";
          delBtn.className =
            "text-xs text-red-600 hover:underline whitespace-nowrap delete-tip";
          delBtn.dataset.id = t.tip_id;
          delBtn.dataset.spot = spotId;
          item.appendChild(delBtn);
        }
  
        listEl.appendChild(item);
      });
  
      attachDeleteTipHandlers();
      attachSubmitTipHandler();
    } catch (e) {
        console.error("loadSpotTips error", e);
        
        // Hide list content and show the friendly empty message
        listEl.innerHTML = "";
        emptyEl.classList.remove("hidden");
      }
      
  }
  
  function attachSubmitTipHandler() {
    const btn = document.getElementById("submit-tip");
    if (!btn) return;
  
    btn.onclick = async () => {
      if (!currentUser) {
        alert("You must be logged in to add a tip.");
        return;
      }
  
      const textarea = document.getElementById("new-tip");
      if (!textarea) return;
  
      const content = textarea.value.trim();
      if (!content) return;
  
      try {
        const res = await fetch("/api/spot-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spot_id: currentSpotId,
            content,
          }),
        });
        if (!res.ok) {
        if (res.status === 403) {
          alert("You must be logged in to add a tip.");
          return;
        }
        throw new Error("Failed to save tip");
      }

      textarea.value = "";
      await loadSpotTips(currentSpotId);
    } catch (e) {
      console.error("add tip error", e);
      alert("Could not save tip. Please try again.");
    }
  };
}
  
  function attachDeleteTipHandlers() {
    document.querySelectorAll(".delete-tip").forEach((btn) => {
      btn.onclick = async () => {
        const tipId = btn.dataset.id;
        const spotId = btn.dataset.spot;
  
        const sure = window.confirm("Delete this tip?");
        if (!sure) return;
  
        try {
          const res = await fetch(`/api/spot-tips/${tipId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete");
          await loadSpotTips(spotId);
        } catch (e) {
          console.error("delete tip error", e);
          alert("Could not delete tip.");
        }
      };
    });
  }
  
  // -----------------------------
  // TABS (unchanged, just used for "Spot Details" + "Tips")
  // -----------------------------
  let infoButton = document.getElementById("tab-button-info");
  let postsButton = document.getElementById("tab-button-posts");
  let infoPanel = document.getElementById("tab-spot-info");
  let postsPanel = document.getElementById("tab-posts");
  
  function activateTab(activeButton, inactiveButton, showPanel, hidePanel) {
    activeButton.classList.add("bg-sky-600", "text-white");
    activeButton.classList.remove("text-slate-600", "hover:bg-slate-50");
    activeButton.setAttribute("aria-selected", "true");
  
    inactiveButton.classList.remove("bg-sky-600", "text-white");
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
  
  // -----------------------------
  // INITIALIZE
  // -----------------------------
  async function initializeSpotPage() {
    await loadCurrentUser();
    setupTabs();
    setupTipsAuthState();
    loadSpotPage();
}


window.addEventListener("DOMContentLoaded", initializeSpotPage);
