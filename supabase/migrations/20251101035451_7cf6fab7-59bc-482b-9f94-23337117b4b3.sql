-- Permetti agli admin di eliminare le segnalazioni
CREATE POLICY "Admins can delete reports"
ON public.user_reports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));