
CREATE OR REPLACE FUNCTION public.send_like(
  _to_user_id uuid,
  _use_credits boolean DEFAULT false
)
RETURNS TABLE(
  success boolean,
  already_exists boolean,
  match_created boolean,
  likes_remaining integer,
  credits_used boolean,
  new_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_from uuid := auth.uid();
  v_like_exists boolean;
  v_match_id uuid;
  v_user1 uuid;
  v_user2 uuid;
  -- consume_daily_like results
  v_consume_success boolean;
  v_consume_remaining integer;
  v_consume_credits_used boolean;
  v_consume_balance integer;
BEGIN
  -- Must be authenticated
  IF v_from IS NULL THEN
    RETURN QUERY SELECT false, false, false, 0, false, 0;
    RETURN;
  END IF;

  -- Cannot like yourself
  IF v_from = _to_user_id THEN
    RETURN QUERY SELECT false, false, false, 0, false, 0;
    RETURN;
  END IF;

  -- Check if like already exists
  SELECT EXISTS(
    SELECT 1 FROM public.likes WHERE from_user_id = v_from AND to_user_id = _to_user_id
  ) INTO v_like_exists;

  IF v_like_exists THEN
    -- Idempotent: return success without consuming anything
    SELECT uc.daily_likes_remaining, uc.balance
    INTO v_consume_remaining, v_consume_balance
    FROM public.user_credits uc WHERE uc.user_id = v_from;

    RETURN QUERY SELECT true, true, false, COALESCE(v_consume_remaining, 0), false, COALESCE(v_consume_balance, 0);
    RETURN;
  END IF;

  -- Also check if a match already exists (like was consumed by trigger)
  v_user1 := LEAST(v_from, _to_user_id);
  v_user2 := GREATEST(v_from, _to_user_id);
  SELECT id INTO v_match_id FROM public.matches WHERE user1_id = v_user1 AND user2_id = v_user2;
  IF v_match_id IS NOT NULL THEN
    SELECT uc.daily_likes_remaining, uc.balance
    INTO v_consume_remaining, v_consume_balance
    FROM public.user_credits uc WHERE uc.user_id = v_from;
    RETURN QUERY SELECT true, true, true, COALESCE(v_consume_remaining, 0), false, COALESCE(v_consume_balance, 0);
    RETURN;
  END IF;

  -- Consume daily like (or credits)
  SELECT cl.success, cl.likes_remaining, cl.credits_used, cl.new_balance
  INTO v_consume_success, v_consume_remaining, v_consume_credits_used, v_consume_balance
  FROM public.consume_daily_like(v_from, _use_credits) cl;

  IF NOT v_consume_success THEN
    RETURN QUERY SELECT false, false, false, COALESCE(v_consume_remaining, 0), false, COALESCE(v_consume_balance, 0);
    RETURN;
  END IF;

  -- Insert the like (trigger check_and_create_match may consume it and create a match)
  BEGIN
    INSERT INTO public.likes (from_user_id, to_user_id) VALUES (v_from, _to_user_id);
  EXCEPTION WHEN unique_violation THEN
    -- Race condition: already inserted
    NULL;
  END;

  -- Check if match was created by trigger
  SELECT id INTO v_match_id FROM public.matches WHERE user1_id = v_user1 AND user2_id = v_user2;

  RETURN QUERY SELECT true, false, (v_match_id IS NOT NULL), v_consume_remaining, v_consume_credits_used, v_consume_balance;
END;
$$;
