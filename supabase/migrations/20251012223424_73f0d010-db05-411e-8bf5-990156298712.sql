-- Add relationship_type field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS relationship_type text;

COMMENT ON COLUMN public.profiles.relationship_type IS 'Type of relationship the user is looking for: serious, casual, or friendship';