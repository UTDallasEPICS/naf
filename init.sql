-- init.sql
CREATE TABLE crawler_data (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    academy TEXT,
    track_certified TEXT,
    high_school TEXT,
    company TEXT,
    city TEXT,
    state TEXT,
    url TEXT
);

CREATE TABLE analyzer_data (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    academy TEXT,
    track_certified TEXT,
    high_school TEXT,
    company TEXT,
    city TEXT,
    state TEXT
);

CREATE TABLE enricher_data (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    academy TEXT,
    track_certified TEXT,
    high_school TEXT,
    company TEXT,
    city TEXT,
    state TEXT
);
