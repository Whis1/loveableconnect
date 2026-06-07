ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at
ON public.profiles (last_login_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_profiles_last_logout_at
ON public.profiles (last_logout_at DESC NULLS LAST);

COMMENT ON COLUMN public.profiles.last_login_at IS 'Last time the profile was seen entering an authenticated session.';
COMMENT ON COLUMN public.profiles.last_logout_at IS 'Last time the profile explicitly left the authenticated session or page.';
