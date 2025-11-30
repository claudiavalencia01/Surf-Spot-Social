// app/routes/users.js
const express = require("express");
const router = express.Router();

const pool = global.pool;

// Helper: get user row from DB based on session token
async function getUserFromSession(req) {
  const token = req.cookies.token;
  if (!token) return null;

  try {
    // Look up username from sessions table
    const sessionRes = await pool.query(
      "SELECT username FROM sessions WHERE token = $1",
      [token]
    );

    if (!sessionRes.rows.length) return null;
    const username = sessionRes.rows[0].username;

    // Look up user from users table
    const userRes = await pool.query(
      `SELECT user_id, first_name, last_name, username, email, bio, profile_pic_url
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (!userRes.rows.length) return null;
    return userRes.rows[0];
  } catch (err) {
    console.error("getUserFromSession error (users.js):", err);
    return null;
  }
}

// GET /api/users/me  → get full profile
router.get("/me", async (req, res) => {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return res.json({ user: null });
    }
    res.json({ user });
  } catch (err) {
    console.error("GET /api/users/me error:", err);
    res.sendStatus(500);
  }
});


// PUT /api/users/me  → update profile
router.put("/me", async (req, res) => {
  try {
    const user = await getUserFromSession(req);
    if (!user) return res.sendStatus(403);

    const { first_name, last_name, email, bio, profile_pic_url } = req.body;

    await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, bio = $4, profile_pic_url = $5
       WHERE user_id = $6`,
      [first_name, last_name, email, bio, profile_pic_url, user.user_id]
    );

    res.send("Profile updated");
  } catch (err) {
    console.error("PUT /api/users/me error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
