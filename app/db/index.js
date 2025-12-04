// app/db/index.js
const { Pool } = require("pg");
const path = require("path");

let config;

// Prefer DATABASE_URL if present (useful for deploys), otherwise env.json
if (process.env.DATABASE_URL) {
  // Example: postgres://user:pass@host:5432/dbname
  config = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
  };
} else {
  // Local dev config from env.json
  const env = require(path.join(__dirname, "..", "env.json"));
  config = {
    user: env.user,
    host: env.host,
    database: env.database,
    password: env.password,
    port: env.port || 5432,
  };
}

const pool = new Pool(config);

module.exports = pool;
