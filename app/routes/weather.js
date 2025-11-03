// app/routes/weather.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// GET /api/weather?lat=...&lon=...
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).send("Missing latitude or longitude");

  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,sea_surface_temperature`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching weather data:", err.response ? err.response.data : err.message);
    res.status(500).send("Error fetching weather data");
  }
});

module.exports = router;
