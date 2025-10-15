-- Remove foreign key constraint from profiles.id to allow admin profiles without auth users
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;