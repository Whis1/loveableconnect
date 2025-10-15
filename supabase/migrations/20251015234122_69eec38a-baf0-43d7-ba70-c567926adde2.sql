-- Allow admins to create admin profiles with custom IDs
CREATE POLICY "Admins can create admin profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_profile = true 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);