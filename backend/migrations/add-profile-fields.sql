-- Migration: Add profile fields for employee details
-- Adds fields for phone, skills, join_date, experience, and previous projects

SET search_path TO erp, public;

-- Add profile fields to users table or extend profiles table
ALTER TABLE erp.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[], -- Array of skills
ADD COLUMN IF NOT EXISTS join_date DATE, -- Date when employee joined
ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4, 1), -- Years of experience
ADD COLUMN IF NOT EXISTS previous_projects JSONB, -- JSON array of previous projects
ADD COLUMN IF NOT EXISTS bio TEXT, -- Employee bio/description
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_join_date ON erp.profiles(join_date);

-- Add comments for clarity
COMMENT ON COLUMN erp.profiles.phone IS 'Employee phone number';
COMMENT ON COLUMN erp.profiles.skills IS 'Array of employee skills';
COMMENT ON COLUMN erp.profiles.join_date IS 'Date when employee joined the company';
COMMENT ON COLUMN erp.profiles.experience_years IS 'Total years of professional experience';
COMMENT ON COLUMN erp.profiles.previous_projects IS 'JSON array of previous projects with name, description, duration';
COMMENT ON COLUMN erp.profiles.bio IS 'Employee biography/description';

-- Show successful migration
SELECT 'Profile fields added successfully' AS status;

