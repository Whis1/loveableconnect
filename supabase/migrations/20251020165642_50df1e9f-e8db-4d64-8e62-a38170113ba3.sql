-- Create banned_users table
CREATE TABLE public.banned_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES auth.users(id),
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Admins can view all banned users
CREATE POLICY "Admins can view all banned users"
ON public.banned_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can ban users
CREATE POLICY "Admins can ban users"
ON public.banned_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can unban users
CREATE POLICY "Admins can unban users"
ON public.banned_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can check if they are banned
CREATE POLICY "Users can check their own ban status"
ON public.banned_users
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_banned_users_user_id ON public.banned_users(user_id);