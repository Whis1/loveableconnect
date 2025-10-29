-- Add birthdate column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.birthdate IS 'User birth date in YYYY-MM-DD format. Age is calculated from this field.';

-- Update existing admin profiles with appropriate birthdates based on their current age
-- This ensures admin profiles also have birthdates and will auto-update their age
UPDATE public.profiles
SET birthdate = CURRENT_DATE - (COALESCE(age, 25) * INTERVAL '1 year')
WHERE birthdate IS NULL AND age IS NOT NULL;

-- For profiles without age, set a default birthdate (30 years old)
UPDATE public.profiles
SET birthdate = CURRENT_DATE - (30 * INTERVAL '1 year')
WHERE birthdate IS NULL;