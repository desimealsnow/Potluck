-- Add meal_preferences column to user_profiles table
-- This migration adds dietary preferences support for users

BEGIN;

-- Add meal_preferences column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS meal_preferences text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.meal_preferences IS 'Array of dietary preferences (e.g., vegetarian, vegan, gluten-free)';

COMMIT;
