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

// global object for storing tokens
// in a real app, we'd save them to a db so even if the server exits
// users will still be logged in when it restarts
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

    // Login after creating account
    let token = makeToken();
    tokenStorage[token] = username;
    res.cookie("token", token, cookieOptions).status(200).send("User created and logged in");
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});