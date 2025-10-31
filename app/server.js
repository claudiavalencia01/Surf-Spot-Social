let express = require("express");
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

let tokenStorage = {};

pool.connect().then(() => {
    console.log("Connected to database");
});

function makeToken() {
    return crypto.randomBytes(32).toString("hex");
}

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

// Create Account
app.post("/create", async(req, res) => {
    let { first_name, last_name, username, email, password } = req.body;

    if (!validateBody(req.body, ["first_name", "last_name", "username", "email", "password"])) {
        return res.status(400).send("Missing required fields");
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

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});