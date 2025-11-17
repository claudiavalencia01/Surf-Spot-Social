const express = require("express");
const router = express.Router();
const pool = global.pool;

// --- AUTH MIDDLEWARE ---
function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token || !global.tokenStorage[token]) return res.sendStatus(403);
  req.username = global.tokenStorage[token];
  next();
}

// ===================================================================
// GET ALL POSTS
// ===================================================================
router.get("/", async (req, res) => {
  const q = `
    SELECT p.post_id, p.title, p.content, p.created_at,
           u.username, u.user_id
    FROM posts p
    JOIN users u ON p.user_id = u.user_id
    ORDER BY p.created_at DESC
  `;
  const result = await pool.query(q);
  res.json(result.rows);
});

// ===================================================================
// GET ONE POST
// ===================================================================
router.get("/:id", async (req, res) => {
  const q = `
    SELECT p.post_id, p.title, p.content, p.user_id, p.created_at,
           u.username
    FROM posts p
    JOIN users u ON p.user_id = u.user_id
    WHERE p.post_id = $1
  `;
  const r = await pool.query(q, [req.params.id]);
  if (!r.rows.length) return res.sendStatus(404);
  res.json(r.rows[0]);
});

// ===================================================================
// CREATE POST
// ===================================================================
router.post("/", auth, async (req, res) => {
  const { title, content } = req.body;

  const user = await pool.query("SELECT user_id FROM users WHERE username=$1", [
    req.username,
  ]);

  const userId = user.rows[0].user_id;

  await pool.query(
    "INSERT INTO posts (title, content, user_id) VALUES ($1, $2, $3)",
    [title, content, userId]
  );

  res.sendStatus(201);
});

// ===================================================================
// UPDATE POST
// ===================================================================
router.put("/:id", auth, async (req, res) => {
  const { title, content } = req.body;

  // Get owner
  const post = await pool.query(
    "SELECT user_id FROM posts WHERE post_id=$1",
    [req.params.id]
  );
  if (!post.rows.length) return res.sendStatus(404);

  const owner = post.rows[0].user_id;

  // Get current user
  const user = await pool.query("SELECT user_id FROM users WHERE username=$1", [
    req.username,
  ]);
  const userId = user.rows[0].user_id;

  if (userId !== owner) return res.sendStatus(403);

  await pool.query(
    "UPDATE posts SET title=$1, content=$2 WHERE post_id=$3",
    [title, content, req.params.id]
  );

  res.sendStatus(200);
});

// ===================================================================
// DELETE POST
// ===================================================================
router.delete("/:id", auth, async (req, res) => {
  // Get owner
  const post = await pool.query(
    "SELECT user_id FROM posts WHERE post_id=$1",
    [req.params.id]
  );
  if (!post.rows.length) return res.sendStatus(404);

  const owner = post.rows[0].user_id;

  // Get current user
  const user = await pool.query("SELECT user_id FROM users WHERE username=$1", [
    req.username,
  ]);
  const userId = user.rows[0].user_id;

  if (userId !== owner) return res.sendStatus(403);

  await pool.query("DELETE FROM posts WHERE post_id=$1", [req.params.id]);
  res.sendStatus(200);
});

module.exports = router;
