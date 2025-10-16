-- Rimuovi la policy precedente
DROP POLICY IF EXISTS "Admin profiles can send and view messages" ON public.messages;

-- Policy per permettere agli admin di inviare messaggi da profili admin
CREATE POLICY "Admins can send messages as admin profiles"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utente ha il ruolo admin E il sender è un profilo admin
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = messages.sender_id
      AND profiles.is_admin_profile = true
    )
  )
  -- OPPURE l'utente sta inviando da se stesso
  OR auth.uid() = sender_id
);

-- Policy per permettere agli admin di vedere tutti i messaggi
CREATE POLICY "Admins can view all messages as admin profiles"
ON public.messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = sender_id
  OR auth.uid() = receiver_id
);