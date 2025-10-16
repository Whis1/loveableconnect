-- Rimuovi le policy problematiche
DROP POLICY IF EXISTS "Admin profiles can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admin profiles can view all messages" ON public.messages;

-- Crea una policy più permissiva per i profili admin
CREATE POLICY "Admin profiles can send and view messages"
ON public.messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin_profile = true
  )
  OR auth.uid() = sender_id
  OR auth.uid() = receiver_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin_profile = true
  )
  OR auth.uid() = sender_id
);