-- Initialize S4 Labs Database
-- This script sets up the initial database structure

-- Create production database (for production environment)
CREATE DATABASE s4labs_prod;

-- Grant all privileges to the s4labs user
GRANT ALL PRIVILEGES ON DATABASE s4labs_dev TO s4labs;
GRANT ALL PRIVILEGES ON DATABASE s4labs_prod TO s4labs;

-- Connect to the development database
\c s4labs_dev;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance (these will be created by Prisma migrations, but we can add custom ones here)
-- Custom indexes can be added here if needed

-- Initial admin user setup (optional)
-- This will be handled by the seed script instead