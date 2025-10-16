-- Permetti agli utenti di creare matches quando inviano richieste
CREATE POLICY "Users can create matches for gallery requests"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Permetti agli admin di creare matches per admin profiles
CREATE POLICY "Admins can create matches for admin profiles"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);