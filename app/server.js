// app/server.js
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const argon2 = require("argon2");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

// Locally, load .env from project root (one level above /app)
if (!process.env.VERCEL) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const hostname = "localhost";
const port = 3000;

function deriveProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return supabaseUrl.replace(/^https?:\/\/|\.supabase\.co.*$/g, "");
  }
  const raw = process.env.SUPABASE_POSTGRES_URL_NON_POOLING || process.env.SUPABASE_POSTGRES_URL;
  try {
    if (raw) {
      const parsed = new URL(raw);
      if (parsed.username.startsWith("postgres.")) {
        return parsed.username.split(".")[1];
      }
    }
  } catch (_) {}
  return null;
}

function resolveConnectionString() {
  return (
    process.env.SUPABASE_POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_POSTGRES_URL ||
    null
  );
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  throw new Error("Missing Supabase connection string. Set SUPABASE_POSTGRES_URL_NON_POOLING.");
}

let sslConfig = undefined;
try {
  const { hostname: dbHost } = new URL(connectionString);
  const needsSSL = !["localhost", "127.0.0.1"].includes(dbHost);
  if (needsSSL) {
    sslConfig = { require: true, rejectUnauthorized: false };
  }
} catch (_) {
  sslConfig = { require: true, rejectUnauthorized: false };
}

// Connect to Supabase Postgres
const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

global.pool = pool;

const app = express();
app.use(express.json());
app.use(cookieParser());

// Cookie config
const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "strict"
};

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

// API routes (AFTER tokenStorage is set)
app.use("/api/spots", require("./routes/spots"));
app.use("/api/weather", require("./routes/weather"));
app.use("/api/geocode", require("./routes/geocode"));
app.use("/api/users", require("./routes/users"));   // profile routes
app.use("/api/posts", require("./routes/posts"));
app.use("/api/comments", require("./routes/comments"));


// --- IMAGE UPLOADS FOLDER ---
const fs = require("fs");

// Create /uploads folder if not exists
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve uploaded files
app.use("/uploads", express.static(uploadsPath));



// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Register + Login pages
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Beach page
app.get("/spots/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "spot.html"));
});


// --- AUTH SYSTEM ---
function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function validateBody(body, required) {
  return required.every(f => !!body[f]);
}

function validateUsername(u) {
  return /^[a-zA-Z0-9]{3,20}$/.test(u);
}

function validatePassword(p) {
  return p.length >= 6;
}

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// Helper: get username from DB-backed session
async function getUsernameFromToken(req) {
  const token = req.cookies.token;
  if (!token) return null;

  try {
    const result = await pool.query(
      "SELECT username FROM sessions WHERE token = $1",
      [token]
    );
    if (!result.rows.length) return null;
    return result.rows[0].username;
  } catch (err) {
    console.error("getUsernameFromToken error:", err);
    return null;
  }
}

// CREATE USER
app.post("/create", async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body;

  if (!validateBody(req.body, ["first_name", "last_name", "username", "email", "password"]))
    return res.status(400).send("Missing required fields");

  if (!validateUsername(username))
    return res.status(400).send("Username must be 3-20 alphanumeric characters");

  if (!validatePassword(password))
    return res.status(400).send("Password must be at least 6 characters");

  if (!validateEmail(email))
    return res.status(400).send("Invalid email format");

  try {
    const exists = await pool.query(
      "SELECT 1 FROM users WHERE username=$1 OR email=$2",
      [username, email]
    );

    if (exists.rows.length)
      return res.status(400).send("Username or email already exists");

    const hash = await argon2.hash(password);

    await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [first_name, last_name, username, email, hash]
    );

    res.status(200).send("User created successfully. Please log in.");
  } catch (err) {
    console.error("Error creating user:", err);
    res.sendStatus(500);
  }
});

// LOGIN  ✅ writes into sessions table now
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!validateBody(req.body, ["username", "password"]))
    return res.status(400).send("Missing username or password");

  try {
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE username = $1",
      [username]
    );

    if (!result.rows.length)
      return res.status(400).send("Invalid credentials");

    const valid = await argon2.verify(result.rows[0].password_hash, password);
    if (!valid)
      return res.status(400).send("Invalid credentials");

    const token = makeToken();

    // 🔐 store session in DB
    await pool.query(
      "INSERT INTO sessions (token, username) VALUES ($1, $2)",
      [token, username]
    );

    res
      .cookie("token", token, cookieOptions)
      .status(200)
      .send("Logged in successfully");
  } catch (err) {
    console.error("Login error:", err);
    res.sendStatus(500);
  }
});

// LOGOUT  ✅ removes session from DB
app.post("/logout", async (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(400).send("Already logged out");
  }

  try {
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
  } catch (err) {
    console.error("Logout delete session error:", err);
    // still clear cookie
  }

  res
    .clearCookie("token", cookieOptions)
    .send("Logged out successfully");
});

// Simple public/private routes using DB sessions
const authorize = async (req, res, next) => {
  const username = await getUsernameFromToken(req);
  if (!username) return res.sendStatus(403);
  req.username = username;
  next();
};

app.get("/public", (req, res) => res.send("A public message\n"));
app.get("/private", authorize, (req, res) => res.send("A private message\n"));

// /me for navbar / frontend
app.get("/me", async (req, res) => {
  const username = await getUsernameFromToken(req);
  if (!username) return res.json({ user: null });
  res.json({ user: { username } });
});

// Start server after DB connects
if (process.env.VERCEL) {
  // On Vercel: export the app, Vercel handles incoming requests
  module.exports = app;
} else {
  // Local dev: connect DB and start listening
  pool.connect()
    .then(() => {
      console.log("Connected to database");
      app.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}`);
      });
    })
    .catch(err => {
      console.error("Database connection failed:", err);
      process.exit(1);
    });
}
