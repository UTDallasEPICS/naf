-- init.sql

-- Crawler table
CREATE TABLE crawler_data (
    crawler_id SERIAL PRIMARY KEY,
    profile_url TEXT,
    json JSONB
);

-- Analyzer table
CREATE TABLE analyzer_data (
    analyzer_id SERIAL PRIMARY KEY,
    confidence_percentage REAL,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    high_school TEXT,
    hs_graduation_year TEXT,
    naf_academy TEXT,
    naf_track_certified TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    birthdate DATE,
    gender TEXT,
    ethnicity TEXT,
    military_branch_served TEXT,
    current_job TEXT,
    college_major TEXT,
    university_grad_year TEXT,
    university TEXT,
    degree TEXT,
    linkedin_link TEXT,
    school_district TEXT,
    internship_company1 TEXT,
    internship_end_date1 DATE,
    internship_company2 TEXT,
    internship_end_date2 DATE,
    university2 TEXT,
    college_major2 TEXT,
    degree2 TEXT
);

-- Enricher table
CREATE TABLE enricher_data (
    enricher_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    high_school TEXT,
    hs_graduation_year TEXT,
    naf_academy TEXT,
    naf_track_certified TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    birthdate DATE,
    gender TEXT,
    ethnicity TEXT,
    military_branch_served TEXT,
    current_job TEXT,
    college_major TEXT,
    university_grad_year TEXT,
    university TEXT,
    degree TEXT,
    linkedin_link TEXT,
    school_district TEXT,
    internship_company1 TEXT,
    internship_end_date1 DATE,
    internship_company2 TEXT,
    internship_end_date2 DATE,
    university2 TEXT,
    college_major2 TEXT,
    degree2 TEXT
);
