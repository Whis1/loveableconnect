-- Add risiko_elo field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS risiko_elo INTEGER DEFAULT 1200;

-- Create index for better performance on leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_risiko_elo ON public.profiles(risiko_elo DESC);