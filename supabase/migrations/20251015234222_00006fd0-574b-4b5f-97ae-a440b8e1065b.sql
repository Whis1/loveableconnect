-- Drop old policy
DROP POLICY IF EXISTS "Admins can create admin profiles" ON public.profiles;

-- Allow any authenticated user to create admin profiles (for testing)
CREATE POLICY "Allow creating admin profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (is_admin_profile = true);