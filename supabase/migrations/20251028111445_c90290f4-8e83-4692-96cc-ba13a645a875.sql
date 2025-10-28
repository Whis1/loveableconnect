-- Add user_images_link column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_images_link text;