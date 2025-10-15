-- Add flag to identify admin-created profiles
ALTER TABLE public.profiles 
ADD COLUMN is_admin_profile boolean NOT NULL DEFAULT false;

-- Create index for better performance
CREATE INDEX idx_profiles_admin ON public.profiles(is_admin_profile) WHERE is_admin_profile = true;