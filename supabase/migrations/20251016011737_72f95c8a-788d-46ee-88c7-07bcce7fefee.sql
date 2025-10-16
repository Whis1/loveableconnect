-- Aggiungi policy per permettere agli admin di aggiornare qualsiasi richiesta di accesso
CREATE POLICY "Admins can update any gallery access request"
ON public.gallery_access_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = profile_id
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = profile_id
);

-- Aggiungi policy per permettere agli admin di vedere tutte le richieste
CREATE POLICY "Admins can view all gallery access requests"
ON public.gallery_access_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = requester_id
  OR auth.uid() = profile_id
);