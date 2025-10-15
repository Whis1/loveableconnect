-- Add gallery_private column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN gallery_private BOOLEAN DEFAULT false;