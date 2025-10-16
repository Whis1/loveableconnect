-- Remove gallery access requests table
DROP TABLE IF EXISTS public.gallery_access_requests;

-- Remove gallery_private column from profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS gallery_private;