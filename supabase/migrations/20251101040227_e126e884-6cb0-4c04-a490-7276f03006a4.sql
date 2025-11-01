-- Funzione per creare una segnalazione con sicurezza elevata
CREATE OR REPLACE FUNCTION public.create_user_report(
  _reported_id uuid,
  _match_id uuid,
  _report_type text,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  -- Richiede utente autenticato
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_reports (reporter_id, reported_id, match_id, report_type, reason)
  VALUES (auth.uid(), _reported_id, _match_id, _report_type, NULLIF(TRIM(_reason), ''))
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- Consenti agli utenti autenticati di eseguire la funzione
REVOKE ALL ON FUNCTION public.create_user_report(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_report(uuid, uuid, text, text) TO authenticated;