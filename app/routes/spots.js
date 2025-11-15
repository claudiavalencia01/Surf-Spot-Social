// app/routes/spots.js
const express = require("express");
const router = express.Router();

// Use the pool created in server.js
const pool = global.pool;
if (!pool) {
  throw new Error("Database pool not initialized. In server.js, set: global.pool = pool BEFORE app.use('/api/spots', ...)");
}

// GET /api/spots  -> list all (optional filters: ?q=, ?region=)
router.get("/", async (req, res) => {
  const { q, region } = req.query;
  try {
    let sql = `
      SELECT id, name, description, latitude, longitude, country, region
      FROM surf_spots
    `;
    const params = [];
    const where = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`);
    }
    if (region) {
      params.push(region);
      where.push(`LOWER(region) = LOWER($${params.length})`);
    }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY name ASC";

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/spots error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/spots/:id  -> single spot + live marine weather
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, latitude, longitude, country, region
       FROM surf_spots WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Spot not found" });

    const spot = rows[0];

    // Open-Meteo Marine API
    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", spot.latitude);
    url.searchParams.set("longitude", spot.longitude);
    url.searchParams.set("hourly", "wave_height,wind_wave_height,wind_wave_direction,wind_wave_period,wind_speed_10m,wind_direction_10m");
    url.searchParams.set("daily", "wave_height_max,wind_wave_height_max");
    url.searchParams.set("timezone", "auto");

    const wxResp = await fetch(url.toString());
    if (!wxResp.ok) throw new Error(`Weather API error: ${wxResp.status}`);
    const weather = await wxResp.json();

    res.json({ spot, weather });
  } catch (err) {
    console.error("GET /api/spots/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE a new spot from a map click
router.post("/", async (req, res) => {
  try {
    let { name, description, latitude, longitude, country, region } = req.body;

    // basic validation
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "name, latitude, and longitude are required" });
    }
    latitude = Number(latitude);
    longitude = Number(longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const created_by = null; // (hook in your auth later if you want)

    const insert = await pool.query(
      `INSERT INTO surf_spots
        (name, description, latitude, longitude, country, region, created_by, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'user')
       RETURNING id, name, description, latitude, longitude, country, region, created_by, created_at, source`,
      [name, description || null, latitude, longitude, country || null, region || null, created_by]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("POST /api/spots error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
