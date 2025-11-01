-- Aggiungi policy per permettere agli admin di inserire unlock per qualsiasi utente
CREATE POLICY "Admins can insert unlock for any user"
ON public.likes_unlocked
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Aggiungi policy per permettere agli admin di aggiornare unlock per qualsiasi utente
CREATE POLICY "Admins can update unlock for any user"
ON public.likes_unlocked
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Aggiungi policy per permettere agli admin di visualizzare tutti gli unlock
CREATE POLICY "Admins can view all unlocks"
ON public.likes_unlocked
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));