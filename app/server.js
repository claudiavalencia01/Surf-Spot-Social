let express = require("express");
const path = require("path");
let { Pool } = require("pg");
let argon2 = require("argon2");
let cookieParser = require("cookie-parser");
let crypto = require("crypto");
let env = require("../env.json");

let hostname = "localhost";
let port = 3000;

let pool = new Pool(env);
let app = express();
app.use(express.json());
app.use(cookieParser());

// Serve static frontend files from /public
app.use(express.static("public"));

// Root route -> load index.html for localhost:3000/
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

let tokenStorage = {};

pool.connect().then(() => {
    console.log("Connected to database");
});

function makeToken() {
    return crypto.randomBytes(32).toString("hex");
}
// this new route for register page:
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/register.html"));
});

//  same for login page route:
//app.get("/login", (req, res) => {
  //res.sendFile(path.join(__dirname, "../public/login.html"));
//});

// Cookie settings
let cookieOptions = {
    httpOnly: true,
    secure: false, // false for localhost; true in production (HTTPS)
    sameSite: "strict",
};

function validateBody(body, requiredFields){
    for (let field of requiredFields) {
        if (!body[field]) {
            return false;
        }
    }
    return true;
}

function validateUsername(username) {
    return /^[a-zA-Z0-9]{3,20}$/.test(username);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Create Account
app.post("/create", async(req, res) => {
    let { first_name, last_name, username, email, password } = req.body;

    if (!validateBody(req.body, ["first_name", "last_name", "username", "email", "password"])) {
        return res.status(400).send("Missing required fields");
    }

    if (!validateUsername(username)) {
        return res.status(400).send("Username must 3-20 alphanumeric characters");
    }

    if (!validatePassword(password)) {
        return res.status(400).send("Password must be at least 6 characters");
    }

    if (!validateEmail(email)) {
        return res.status(400).send("Invalid email format");
    }

    // Check if username or email already exists
    let exists;
    try {
        exists = await pool.query(
            "SELECT * FROM users WHERE username=$1 OR email=$2",
            [username, email]
        );
    } catch (error) {
        console.error("SELECT failed:", error);
        return res.sendStatus(500);
    }

    if (exists.rows.length > 0) {
        return res.status(400).send("Username or email already exists");
    }

    // Hash password
    let hash;
    try {
        hash = await argon2.hash(password);
    } catch (error) {
        console.error("Error hashing password:", error);
        return res.sendStatus(500);
    }

    // Insert user into DB
    try {
        await pool.query(
            `INSERT INTO users (first_name, last_name, username, email, password_hash)
            VALUES ($1, $2, $3, $4, $5)`,
            [first_name, last_name, username, email, hash]
        );
    } catch (error) {
        console.error("Error inserting user:", error);
        return res.sendStatus(500);
    }

    // Auto-login after creating account
    let token = makeToken();
    tokenStorage[token] = username;
    res.cookie("token", token, cookieOptions).status(200).send("User created and logged in");
});

// Login
app.post("/login", async (req, res) => {
    let { username, password } = req.body;

    if (!validateBody(req.body, ["username", "password"])) {
        return res.status(400).send("Missing username or password");
    }

    let result;
    try {
        result = await pool.query(
            "SELECT password_hash FROM users WHERE username = $1", 
            [username]
        );
    } catch (error) {
        console.error("SELECT failed:", error);
        return res.sendStatus(500);
    }

    if (result.rows.length === 0) {
        return res.status(400).send("Invalid credentials");
    }

    let hash = result.rows[0].password_hash;
    let verifyResult;
    try {
        verifyResult = await argon2.verify(hash, password);
    } catch (error) {
        console.log("Password verificaton failed:", error);
        return res.sendStatus(500);
    }

    if (!verifyResult) {
        return res.status(400).send("Invalid credentials");
    }

    let token = makeToken();
    tokenStorage[token] = username;
    res.cookie("token", token, cookieOptions).status(200).send("Logged in successfully");
});

// Authorization middleware
let authorize = (req, res, next) => {
    let { token } = req.cookies;
    if (!token || !tokenStorage.hasOwnProperty(token)) {
        return res.sendStatus(403);
    }
    next();
};

// Logout
app.post("/logout", (req, res) => {
    let { token } = req.cookies;

    if (token === undefined) {
        console.log("Already logged out");
        return res.sendStatus(400);
    }


    if (!tokenStorage.hasOwnProperty(token)) {
        console.log("Token doesn't exist");
        return res.sendStatus(400);
    }

    delete tokenStorage[token];
    res.clearCookie("token", cookieOptions).send("Logged out successfully");
});

// Serves content for any user
app.get("/public", (req, res) => {
    return res.send("A public message\n");
});

// Serves content for logged in users
app.get("/private", authorize, (req, res) => {
    return res.send("A private message\n");
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});