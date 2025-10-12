-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS sexual_orientation TEXT,
ADD COLUMN IF NOT EXISTS relationship_status TEXT;

-- Make nickname required for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN nickname SET NOT NULL;