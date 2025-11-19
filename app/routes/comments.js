const express = require("express");
const router = express.Router();

const pool = global.pool;
const tokenStorage = global.tokenStorage;

// Helper: get logged-in user_id
async function getUserIdFromToken(req) {
  const token = req.cookies.token;
  if (!token || !(token in tokenStorage)) return null;

  const username = tokenStorage[token];
  const result = await pool.query(
    "SELECT user_id FROM users WHERE username = $1",
    [username]
  );

  return result.rows.length ? result.rows[0].user_id : null;
}

/* ------------------------------------------
   GET ALL COMMENTS FOR A POST
------------------------------------------- */
router.get("/:postId", async (req, res) => {
  const postId = req.params.postId;

  try {
    const result = await pool.query(
      `SELECT 
         c.comment_id,
         c.post_id,
         c.user_id,
         c.content,
         c.created_at,
         u.username
       FROM comments c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /comments error:", err);
    res.sendStatus(500);
  }
});

/* ------------------------------------------
   CREATE COMMENT
------------------------------------------- */
router.post("/", async (req, res) => {
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.sendStatus(403);

  const { post_id, content } = req.body;
  if (!content) return res.status(400).send("Content required");

  try {
    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING comment_id, post_id, user_id, content, created_at`,
      [post_id, userId, content]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /comments error:", err);
    res.sendStatus(500);
  }
});

/* ------------------------------------------
   DELETE COMMENT
------------------------------------------- */
router.delete("/:commentId", async (req, res) => {
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.sendStatus(403);

  const commentId = req.params.commentId;

  try {
    const ownerCheck = await pool.query(
      "SELECT user_id FROM comments WHERE comment_id = $1",
      [commentId]
    );

    if (!ownerCheck.rows.length) return res.sendStatus(404);
    if (ownerCheck.rows[0].user_id !== userId) return res.sendStatus(403);

    await pool.query("DELETE FROM comments WHERE comment_id = $1", [
      commentId,
    ]);

    res.sendStatus(200);
  } catch (err) {
    console.error("DELETE /comments error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
