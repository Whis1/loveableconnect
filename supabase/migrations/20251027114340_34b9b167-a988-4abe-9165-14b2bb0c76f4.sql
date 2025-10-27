-- Add show_online_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_online_status boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.show_online_status IS 'Controls if user wants to show their online status to others';