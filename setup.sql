DROP DATABASE IF EXISTS surfspot_social;
CREATE DATABASE surfspot_social;
\c surfspot_social

DROP TABLE IF EXISTS users;
CREATE TABLE users (
	user_id SERIAL PRIMARY KEY,
	username VARCHAR(50) NOT NULL UNIQUE,
	email VARCHAR(100) NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
    bio TEXT,
    profile_pic_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
