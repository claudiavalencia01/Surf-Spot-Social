const express = require("express");
const router = express.Router();

const pool = global.pool;
const tokenStorage = global.tokenStorage;

// Helper: get logged-in user
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
   CREATE COMMENT
------------------------------------------- */
router.post("/:postId", async (req, res) => {
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.sendStatus(403);

  const { content } = req.body;
  const postId = req.params.postId;

  if (!content) return res.status(400).send("Content required");

  try {
    const result = await pool.query(
      `INSERT INTO comments (post_id, created_by, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [postId, userId, content]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /comments error:", err);
    res.sendStatus(500);
  }
});

/* ------------------------------------------
   EDIT COMMENT
------------------------------------------- */
router.put("/:commentId", async (req, res) => {
  const userId = await getUserIdFromToken(req);
  if (!userId) return res.sendStatus(403);

  const { content } = req.body;
  const commentId = req.params.commentId;

  try {
    // Check owner
    const ownerCheck = await pool.query(
      "SELECT created_by FROM comments WHERE id = $1",
      [commentId]
    );

    if (!ownerCheck.rows.length) return res.sendStatus(404);
    if (ownerCheck.rows[0].created_by !== userId) return res.sendStatus(403);

    await pool.query(
      "UPDATE comments SET content = $1 WHERE id = $2",
      [content, commentId]
    );

    res.send("Comment updated");
  } catch (err) {
    console.error("PUT /comments error:", err);
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
      "SELECT created_by FROM comments WHERE id = $1",
      [commentId]
    );

    if (!ownerCheck.rows.length) return res.sendStatus(404);
    if (ownerCheck.rows[0].created_by !== userId) return res.sendStatus(403);

    await pool.query("DELETE FROM comments WHERE id = $1", [commentId]);

    res.send("Comment deleted");
  } catch (err) {
    console.error("DELETE /comments error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
