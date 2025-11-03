DROP DATABASE IF EXISTS surfspot_social;
CREATE DATABASE surfspot_social;
\c surfspot_social

-- Users table 
DROP TABLE IF EXISTS users;
CREATE TABLE users (
	user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
	username VARCHAR(50) NOT NULL UNIQUE,
	email VARCHAR(100) NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
    bio TEXT,
    profile_pic_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Surf spots table
CREATE TABLE IF NOT EXISTS surf_spots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  country TEXT,
  region TEXT
);

-- Seed a few spots (safe to run multiple times)
INSERT INTO surf_spots (name, description, latitude, longitude, country, region)
VALUES
 ('South Beach', 'Good for beginners; wind sensitive', 25.790700, -80.130000, 'USA', 'Florida'),
 ('Atlantic City', 'Consistent beach breaks',          39.364300, -74.422900, 'USA', 'New Jersey'),
 ('Fort Lauderdale', 'Often choppy; can be fun',       26.122400, -80.137300, 'USA', 'Florida')
ON CONFLICT DO NOTHING;
