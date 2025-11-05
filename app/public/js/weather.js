// app/routes/weather.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// GET /api/weather?lat=36.85&lon=-75.98
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon parameters" });
  }

  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wind_speed_10m,wind_direction_10m,wind_wave_height,wind_wave_period,wind_wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,air_temperature,water_temperature`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error("Weather API error:", e);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

module.exports = router;
