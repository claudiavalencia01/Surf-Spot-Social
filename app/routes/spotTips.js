// app/routes/spotTips.js
const express = require("express");
const router = express.Router();

const pool = global.pool;

// Helper: same pattern as comments.js
async function getUserIdFromToken(req) {
  const token = req.cookies.token;
  if (!token) return null;

  try {
    const sessionRes = await pool.query(
      "SELECT username FROM sessions WHERE token = $1",
      [token]
    );
    if (!sessionRes.rows.length) return null;

    const username = sessionRes.rows[0].username;

    const userRes = await pool.query(
      "SELECT user_id FROM users WHERE username = $1",
      [username]
    );

    return userRes.rows.length ? userRes.rows[0].user_id : null;
  } catch (err) {
    console.error("getUserIdFromToken spotTips error:", err);
    return null;
  }
}

/**
 * GET /api/spot-tips/:spotId
 * List all tips for a given surf spot
 */
router.get("/:spotId", async (req, res) => {
  const spotId = req.params.spotId;

  try {
    const result = await pool.query(
      `SELECT 
         t.tip_id,
         t.spot_id,
         t.user_id,
         t.content,
         t.created_at,
         u.username
       FROM spot_tips t
       JOIN users u ON u.user_id = t.user_id
       WHERE t.spot_id = $1
       ORDER BY t.created_at ASC`,
      [spotId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /spot-tips error:", err);
    res.sendStatus(500);
  }
});

/**
 * POST /api/spot-tips
 * Body: { spot_id, content }
 * Create a new tip for a spot (must be logged in)
 */
router.post("/", async (req, res) => {
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.sendStatus(403);

  const { spot_id, content } = req.body;
  if (!spot_id || !content || !content.trim()) {
    return res.status(400).send("spot_id and content are required");
  }

  try {
    const result = await pool.query(
      `INSERT INTO spot_tips (spot_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING tip_id, spot_id, user_id, content, created_at`,
      [spot_id, userId, content.trim()]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /spot-tips error:", err);
    res.sendStatus(500);
  }
});

/**
 * DELETE /api/spot-tips/:tipId
 * Only the owner of the tip can delete it
 */
router.delete("/:tipId", async (req, res) => {
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.sendStatus(403);

  const tipId = req.params.tipId;

  try {
    const ownerCheck = await pool.query(
      "SELECT user_id FROM spot_tips WHERE tip_id = $1",
      [tipId]
    );

    if (!ownerCheck.rows.length) return res.sendStatus(404);
    if (ownerCheck.rows[0].user_id !== userId) return res.sendStatus(403);

    await pool.query("DELETE FROM spot_tips WHERE tip_id = $1", [tipId]);

    res.sendStatus(200);
  } catch (err) {
    console.error("DELETE /spot-tips error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
