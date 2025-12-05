// db.js
require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.SUPABASE_POSTGRES_URL_NON_POOLING) {
  throw new Error("SUPABASE_POSTGRES_URL_NON_POOLING is not set in .env");
}

const connectionString = process.env.SUPABASE_POSTGRES_URL_NON_POOLING;

console.log("[DB] Using connection string:", connectionString); // TEMP: to verify
console.log("🔍 Using Postgres URL:", connectionString);


const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5, // keep this small for Supabase
});

module.exports = pool;