-- Permetti ai profili admin di inviare messaggi
CREATE POLICY "Admin profiles can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = messages.sender_id
    AND profiles.is_admin_profile = true
  )
);

-- Permetti ai profili admin di vedere tutti i messaggi
CREATE POLICY "Admin profiles can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin_profile = true
  )
);