-- =====================================================
-- Database Configuration for PostgreSQL
-- Run this in your PostgreSQL database (pgAdmin, psql, etc.)
-- =====================================================

-- Enable pg_net extension (REQUIRED for email notifications if needed)
-- Note: This extension may not be available in all PostgreSQL installations
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- GRANT USAGE ON SCHEMA net TO postgres;

-- Configure application settings (if needed)
-- ALTER DATABASE your_database_name SET app.base_url = 'http://localhost:5173';

-- Verify database connection
SELECT 
  current_database() as database_name,
  current_user as current_user,
  version() as postgresql_version;

-- Success message
SELECT '✓ PostgreSQL database configuration verified!' as status;

