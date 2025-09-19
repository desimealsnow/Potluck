-- Add setup_completed flag to user_profiles table
-- This migration adds a flag to track if user has completed initial setup

BEGIN;

-- Add setup_completed column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.setup_completed IS 'Flag indicating if user has completed initial profile setup';

COMMIT;
