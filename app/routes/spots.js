// app/routes/spots.js
const express = require("express");
const router = express.Router();

// Use the shared pool created in server.js
const pool = global.pool;
if (!pool) {
  throw new Error(
    "Database pool not initialized. Make sure server.js sets global.pool before requiring routes/spots.js"
  );
}

/**
 * GET /api/spots
 * List all surf spots (optionally filter by ?q= and/or ?region=)
 */
router.get("/", async (req, res) => {
  const { q, region } = req.query;

  try {
    let sql = `
      SELECT id,
             name,
             description,
             latitude,
             longitude,
             country,
             region,
             source
      FROM surf_spots
    `;

    const params = [];
    const where = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`
      );
    }

    if (region) {
      params.push(region);
      where.push(`LOWER(region) = LOWER($${params.length})`);
    }

    if (where.length) {
      sql += " WHERE " + where.join(" AND ");
    }

    sql += " ORDER BY name ASC";

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/spots error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/spots/near?lat=...&lng=...&limit=5
 * Return the closest surf spots to the user (Haversine distance)
 */
router.get("/near", async (req, res) => {
  let { lat, lng, limit } = req.query;

  lat = parseFloat(lat);
  lng = parseFloat(lng);
  limit = parseInt(limit, 10) || 6;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res
      .status(400)
      .json({ message: "lat and lng query params are required and must be numbers" });
  }

  if (limit < 1 || limit > 50) {
    limit = 6;
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        latitude,
        longitude,
        country,
        region,
        source,
        /* distance in km using Haversine formula */
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance_km
      FROM surf_spots
      ORDER BY distance_km ASC
      LIMIT $3
      `,
      [lat, lng, limit]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/spots/near error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * GET /api/spots/:id
 * Get a single surf spot + live marine weather from Open-Meteo
 */
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id,
             name,
             description,
             latitude,
             longitude,
             country,
             region,
             source
      FROM surf_spots
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Spot not found" });
    }

    const spot = rows[0];

    // Build Open-Meteo Marine API URL
    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", spot.latitude);
    url.searchParams.set("longitude", spot.longitude);
    url.searchParams.set(
      "hourly",
      "wave_height,wave_direction,wind_wave_height,wind_wave_direction,wind_wave_period,wind_speed_10m,wind_direction_10m"
    );
    url.searchParams.set(
      "daily",
      "wave_height_max,wind_wave_height_max"
    );
    url.searchParams.set("timezone", "auto");

    let weather = null;
    try {
      const wxResp = await fetch(url.toString());
      if (!wxResp.ok) throw new Error(`Weather API error: ${wxResp.status}`);
      weather = await wxResp.json();
    } catch (wxErr) {
      console.error("Weather fetch failed:", wxErr);
      // Still return the spot, just with weather = null
    }

    res.json({ spot, weather });
  } catch (err) {
    console.error("GET /api/spots/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/spots
 * Create a new surf spot (user-created via map click)
 */
router.post("/", async (req, res) => {
  try {
    let { name, description, latitude, longitude, country, region } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "name, latitude, and longitude are required" });
    }

    latitude = Number(latitude);
    longitude = Number(longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const insert = await pool.query(
      `
      INSERT INTO surf_spots
        (name, description, latitude, longitude, country, region, source)
      VALUES
        ($1, $2, $3, $4, $5, $6, 'user')
      RETURNING id,
                name,
                description,
                latitude,
                longitude,
                country,
                region,
                source
      `,
      [
        name,
        description || null,
        latitude,
        longitude,
        country || null,
        region || null,
      ]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("POST /api/spots error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/spots/:id
 * Update a user-created spot (only rows with source='user')
 */
router.put("/:id", async (req, res) => {
  try {
    let { name, description, latitude, longitude, country, region } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "name, latitude, and longitude are required" });
    }

    latitude = Number(latitude);
    longitude = Number(longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const result = await pool.query(
      `
      UPDATE surf_spots
      SET name = $1,
          description = $2,
          latitude = $3,
          longitude = $4,
          country = $5,
          region = $6
      WHERE id = $7
        AND source = 'user'
      RETURNING id,
                name,
                description,
                latitude,
                longitude,
                country,
                region,
                source
      `,
      [
        name,
        description || null,
        latitude,
        longitude,
        country || null,
        region || null,
        req.params.id,
      ]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ message: "Spot not found or cannot be edited" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/spots/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/spots/:id
 * Delete a user-created spot (only rows with source='user')
 */
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM surf_spots
      WHERE id = $1
        AND source = 'user'
      RETURNING id
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ message: "Spot not found or cannot be deleted" });
    }

    res.json({ message: "Spot deleted", id: req.params.id });
  } catch (err) {
    console.error("DELETE /api/spots/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
