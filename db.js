// db.js
require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  || process.env.SUPABASE_POSTGRES_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
