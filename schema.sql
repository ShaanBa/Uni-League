CREATE TABLE universities ( -- for storing the schools
    uni_id SERIAL PRIMARY KEY, 
    uni_name VARCHAR NOT NULL UNIQUE,
    uni_domain VARCHAR NOT NULL UNIQUE, 
    uni_logo_link VARCHAR
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    user_email VARCHAR NOT NULL UNIQUE, 
    password_hash VARCHAR NOT NUll,
    is_verified BOOLEAN DEFAULT FALSE,
    uni_id INTEGER REFERENCES universities(uni_id)
);

CREATE TABLE summoners (
    summoner_id SERIAL PRIMARY KEY, -- summoner id, normal auto increment with serial and this is the primary key for the table
    puuid VARCHAR NOT NULL UNIQUE, -- puuid unique id for riot games 
    game_name VARCHAR NOT NULL, -- your in game name which does not have to be unique any more but if 2 people have the same game name do they need different tags??
    tag VARCHAR NOT NULL DEFAULT 'NA1', -- the # part of the full name same question with game name 
    rank_division VARCHAR NOT NULL DEFAULT 'NA', -- IM NOT sure on this because what if you are unranked
    rank_tier VARCHAR NOT NULL DEFAULT 'UNRANKED',
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE UNIQUE
);