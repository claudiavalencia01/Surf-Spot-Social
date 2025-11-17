// app/routes/users.js
const express = require("express");
const router = express.Router();

const pool = global.pool;
const tokenStorage = global.tokenStorage;

// GET /api/users/me  → get full profile
router.get("/me", async (req, res) => {
  const { token } = req.cookies;

  if (!token || !(token in tokenStorage))
    return res.json({ user: null });

  const username = tokenStorage[token];

  try {
    const result = await pool.query(
      `SELECT user_id, first_name, last_name, username, email, bio, profile_pic_url
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (!result.rows.length)
      return res.json({ user: null });

    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error("GET /api/users/me error:", err);
    res.sendStatus(500);
  }
});


// PUT /api/users/me  → update profile
router.put("/me", async (req, res) => {
  const { token } = req.cookies;

  if (!token || !(token in tokenStorage))
    return res.sendStatus(403);

  const username = tokenStorage[token];
  const { first_name, last_name, email, bio, profile_pic_url } = req.body;

  try {
    await pool.query(
      `UPDATE users
       SET first_name=$1, last_name=$2, email=$3, bio=$4, profile_pic_url=$5
       WHERE username=$6`,
      [first_name, last_name, email, bio, profile_pic_url, username]
    );

    res.send("Profile updated");
  } catch (err) {
    console.error("PUT /api/users/me error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
