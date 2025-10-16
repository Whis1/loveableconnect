-- Policy per permettere agli admin di aggiornare i profili admin
CREATE POLICY "Admins can update admin profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_admin_profile = true 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  is_admin_profile = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);