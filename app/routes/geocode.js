const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  let query = (req.query.q || "").trim();

  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", query);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error("Geocode fetch failed:", response.status);
      return res.status(502).json({ message: "Geocoding failed" });
    }

    const data = await response.json();

    const results = (data.results || []).map(place => ({
      id: place.id,
      name: place.name,
      region: place.admin1 || "",
      country: place.country || "",
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone || ""
    }));

    res.json({ results });
  } catch (err) {
    console.error("GET /api/geocode error:", err);
    res.status(502).json({ message: "Geocoding failed" });
  }
});

module.exports = router;
