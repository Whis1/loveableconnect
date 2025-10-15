-- Recreate the has_role function if it doesn't exist
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add admin policies for user_credits
DROP POLICY IF EXISTS "Admins can update any user credits" ON public.user_credits;
CREATE POLICY "Admins can update any user credits"
  ON public.user_credits
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all user credits" ON public.user_credits;
CREATE POLICY "Admins can view all user credits"
  ON public.user_credits
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for profiles  
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
CREATE POLICY "Admins can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
  ON public.messages
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can send messages as any user" ON public.messages;
CREATE POLICY "Admins can send messages as any user"
  ON public.messages
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for matches
DROP POLICY IF EXISTS "Admins can view all matches" ON public.matches;
CREATE POLICY "Admins can view all matches"
  ON public.matches
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));