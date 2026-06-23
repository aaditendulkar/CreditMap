-- CreditMap initial database setup
-- This runs once when the container is first created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create test database for CI/CD
CREATE DATABASE creditmap_test;
GRANT ALL PRIVILEGES ON DATABASE creditmap_test TO creditmap;
