const express = require("express");
const router = express.Router();
const pool = global.pool;
const multer = require("multer");
const path = require("path");

// ----------------------
// AUTH MIDDLEWARE
// ----------------------
function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token || !global.tokenStorage[token]) return res.sendStatus(403);
  req.username = global.tokenStorage[token];
  next();
}

// ----------------------
// MULTER SETUP
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

// ----------------------
// GET ALL POSTS
// ----------------------
router.get("/", async (req, res) => {
  const posts = await pool.query(
    `
    SELECT 
      p.post_id, 
      p.title, 
      p.content, 
      p.image_url, 
      p.created_at,
      p.spot_id,
      u.username,

      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.post_id) AS likes,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) AS comment_count

    FROM posts p
    JOIN users u ON u.user_id = p.user_id
    ORDER BY p.created_at DESC
    `
  );

  res.json(posts.rows);
});

// ----------------------
// GET ONE POST
// ----------------------
router.get("/:id", async (req, res) => {
  try {
    const q = `
      SELECT 
        p.post_id, p.title, p.content, p.image_url, p.spot_id, 
        p.user_id, p.created_at,
        u.username
      FROM posts p
      JOIN users u ON u.user_id = p.user_id
      WHERE p.post_id = $1
    `;
    const r = await pool.query(q, [req.params.id]);

    if (!r.rows.length) return res.sendStatus(404);

    res.json(r.rows[0]);
  } catch (err) {
    console.error("GET /posts/:id error:", err);
    res.sendStatus(500);
  }
});

// ----------------------
// CREATE POST
// ----------------------
router.post("/", auth, upload.single("image"), async (req, res) => {
  const { title, content, spot_id } = req.body;

  const userRes = await pool.query(
    "SELECT user_id FROM users WHERE username=$1",
    [req.username]
  );
  const user_id = userRes.rows[0].user_id;

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  await pool.query(
    `
    INSERT INTO posts (user_id, spot_id, title, content, image_url)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [user_id, spot_id || null, title, content, image_url]
  );

  res.sendStatus(201);
});

// ----------------------
// EDIT POST
// ----------------------
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  const { title, content, spot_id } = req.body;

  const post = await pool.query(
    "SELECT user_id FROM posts WHERE post_id=$1",
    [req.params.id]
  );
  if (!post.rows.length) return res.sendStatus(404);

  const owner = post.rows[0].user_id;

  const userRes = await pool.query(
    "SELECT user_id FROM users WHERE username=$1",
    [req.username]
  );
  const user_id = userRes.rows[0].user_id;

  if (owner !== user_id) return res.sendStatus(403);

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  await pool.query(
    `
    UPDATE posts 
    SET title=$1, content=$2, spot_id=$3,
        image_url = COALESCE($4, image_url)
    WHERE post_id=$5
    `,
    [title, content, spot_id || null, image_url, req.params.id]
  );

  res.sendStatus(200);
});

// ----------------------
// DELETE POST
// ----------------------
router.delete("/:id", auth, async (req, res) => {
  const post = await pool.query(
    "SELECT user_id FROM posts WHERE post_id=$1",
    [req.params.id]
  );
  if (!post.rows.length) return res.sendStatus(404);

  const owner = post.rows[0].user_id;

  const userRes = await pool.query(
    "SELECT user_id FROM users WHERE username=$1",
    [req.username]
  );
  const user_id = userRes.rows[0].user_id;

  if (user_id !== owner) return res.sendStatus(403);

  await pool.query("DELETE FROM posts WHERE post_id=$1", [req.params.id]);

  res.sendStatus(200);
});

// ----------------------
// LIKE / UNLIKE
// ----------------------
router.post("/:id/like", auth, async (req, res) => {
  const post_id = req.params.id;

  const userRes = await pool.query(
    "SELECT user_id FROM users WHERE username=$1",
    [req.username]
  );
  const user_id = userRes.rows[0].user_id;

  const liked = await pool.query(
    "SELECT 1 FROM post_likes WHERE user_id=$1 AND post_id=$2",
    [user_id, post_id]
  );

  if (liked.rows.length) {
    await pool.query(
      "DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2",
      [user_id, post_id]
    );
  } else {
    await pool.query(
      "INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)",
      [user_id, post_id]
    );
  }

  res.sendStatus(200);
});

module.exports = router;
