const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const argon2 = require("argon2");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const axios = require("axios"); // <-- added for weather API

// env.json is in the ROOT folder (one level above /app)
const env = require("../env.json");

const hostname = "localhost";
const port = 3000;

// Connect to Postgres
const pool = new Pool(env);
global.pool = pool; // make available to routes

const app = express();
app.use(express.json());
app.use(cookieParser());

// Serve static frontend files from /public
app.use(express.static("public"));

// API routes
app.use("/api/spots", require("./routes/spots"));
app.use("/api/weather", require("./routes/weather"));


// ✅ Weather route (added)
app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  try {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("Weather API error:", err);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Register + Login routes
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public/register.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// Utility functions
const tokenStorage = {};
const cookieOptions = {
  httpOnly: true,
  secure: false, // use true for HTTPS
  sameSite: "strict",
};

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

// Create Account
app.post("/create", async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body;

  if (!validateBody(req.body, ["first_name", "last_name", "username", "email", "password"]))
    return res.status(400).send("Missing required fields");
  if (!validateUsername(username))
    return res.status(400).send("Username must be 3–20 alphanumeric characters");
  if (!validatePassword(password))
    return res.status(400).send("Password must be at least 6 characters");
  if (!validateEmail(email))
    return res.status(400).send("Invalid email format");

  try {
    const exists = await pool.query(
      "SELECT 1 FROM users WHERE username=$1 OR email=$2",
      [username, email]
    );
    if (exists.rows.length) return res.status(400).send("Username or email already exists");

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

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!validateBody(req.body, ["username", "password"]))
    return res.status(400).send("Missing username or password");

  try {
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE username = $1",
      [username]
    );
    if (!result.rows.length) return res.status(400).send("Invalid credentials");

    const valid = await argon2.verify(result.rows[0].password_hash, password);
    if (!valid) return res.status(400).send("Invalid credentials");

    const token = makeToken();
    tokenStorage[token] = username;
    res.cookie("token", token, cookieOptions).status(200).send("Logged in successfully");
  } catch (err) {
    console.error("Login error:", err);
    res.sendStatus(500);
  }
});

// Auth middleware
const authorize = (req, res, next) => {
  const { token } = req.cookies;
  if (!token || !(token in tokenStorage)) return res.sendStatus(403);
  next();
};

// Logout
app.post("/logout", (req, res) => {
  const { token } = req.cookies;
  if (!token || !(token in tokenStorage)) return res.status(400).send("Already logged out");
  delete tokenStorage[token];
  res.clearCookie("token", cookieOptions).send("Logged out successfully");
});

// Public/private test routes
app.get("/public", (req, res) => res.send("A public message\n"));
app.get("/private", authorize, (req, res) => res.send("A private message\n"));

// Start server after DB connects
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
