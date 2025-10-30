-- Crea funzione atomica per mettere like scalando 2 crediti
CREATE OR REPLACE FUNCTION public.like_with_credits(_to_user_id uuid, _cost integer DEFAULT 2)
RETURNS TABLE(success boolean, already_exists boolean, match_created boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_from uuid := auth.uid();
  v_like_exists boolean;
  v_deducted boolean;
  v_balance integer;
  v_user1 uuid;
  v_user2 uuid;
  v_match_id uuid;
BEGIN
  IF v_from IS NULL THEN
    RETURN QUERY SELECT false, false, false, NULL::integer;
    RETURN;
  END IF;

  -- Se il like esiste già, non scalare crediti
  SELECT EXISTS(
    SELECT 1 FROM public.likes WHERE from_user_id = v_from AND to_user_id = _to_user_id
  ) INTO v_like_exists;

  IF v_like_exists THEN
    -- Restituisci successo idempotente, nessuna spesa crediti
    SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = v_from;
    RETURN QUERY SELECT true, true, false, v_balance;
    RETURN;
  END IF;

  -- Scala i crediti (2 di default)
  SELECT public.deduct_credits(v_from, _cost) INTO v_deducted;
  IF NOT v_deducted THEN
    RETURN QUERY SELECT false, false, false, NULL::integer;
    RETURN;
  END IF;

  -- Inserisci il like; il trigger può creare un match e cancellare il like
  BEGIN
    INSERT INTO public.likes (from_user_id, to_user_id)
    VALUES (v_from, _to_user_id);
  EXCEPTION WHEN unique_violation THEN
    -- Concorrenza: un altro inserimento ha già creato il like
    NULL;
  END;

  -- Verifica se è stato creato un match
  v_user1 := LEAST(v_from, _to_user_id);
  v_user2 := GREATEST(v_from, _to_user_id);
  SELECT id INTO v_match_id
  FROM public.matches
  WHERE user1_id = v_user1 AND user2_id = v_user2;

  -- Ritorna il nuovo saldo
  SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = v_from;

  RETURN QUERY SELECT true, false, (v_match_id IS NOT NULL), v_balance;
END;
$$;