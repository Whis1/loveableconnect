-- Aggiungi policy DELETE per admin su support_messages
CREATE POLICY "Admins can delete support messages"
ON public.support_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));