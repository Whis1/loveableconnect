-- Add tutorial_completed field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT false;

-- Update existing profiles to have tutorial completed (only new users will see it)
UPDATE public.profiles SET tutorial_completed = true WHERE tutorial_completed IS NULL;