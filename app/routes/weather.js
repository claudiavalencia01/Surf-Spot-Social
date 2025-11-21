// app/routes/weather.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// in-memory cache for weather responses
let weatherCache = {};
let WEATHER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// GET /api/weather?lat=...&lon=...
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).send("Missing latitude or longitude");

  let cacheKey = `${lat},${lon}`;
  let now = Date.now();

  let cached = weatherCache[cacheKey];
  if (cached && now - cached.timestamp < WEATHER_CACHE_DURATION) {
    return res.json(cached.data);
  }

  try {
    const response = await axios.get("https://marine-api.open-meteo.com/v1/marine", {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: "wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,sea_surface_temperature",
        daily: "wave_height_max,wind_wave_height_max",
        timezone: "auto"
      }
    });

    let data = response.data;

    weatherCache[cacheKey] = {
      timestamp: now,
      data,
    };
    res.json(data);
  } catch (err) {
    console.error("Error fetching weather data:", err.response ? err.response.data : err.message);
    res.status(500).send("Error fetching weather data");
  }
});

module.exports = router;
