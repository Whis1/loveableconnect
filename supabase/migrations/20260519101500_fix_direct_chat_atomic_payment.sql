-- Make direct-chat unlock atomic: create the match only if the 6-credit cost
-- (or weekly free chat / Premium monthly entitlement) is settled in the same
-- database transaction.

CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id uuid)
RETURNS TABLE(match_id uuid, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_user1 uuid;
  v_user2 uuid;
  v_match_id uuid;
  v_inserted_match_id uuid;
  v_balance integer;
  v_is_premium boolean;
  v_subscription_type text;
  v_premium_tier text;
  v_premium_expires_at timestamp with time zone;
  v_premium_active boolean := false;
  v_free_chats integer;
  v_free_chats_reset_at timestamp with time zone;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _other_user_id IS NULL OR _other_user_id = v_caller THEN
    RAISE EXCEPTION 'Invalid other user';
  END IF;

  v_user1 := LEAST(v_caller, _other_user_id);
  v_user2 := GREATEST(v_caller, _other_user_id);

  SELECT id INTO v_match_id
  FROM public.matches
  WHERE user1_id = v_user1 AND user2_id = v_user2
  LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN QUERY SELECT v_match_id, false;
    RETURN;
  END IF;

  INSERT INTO public.matches (user1_id, user2_id)
  VALUES (v_user1, v_user2)
  ON CONFLICT (user1_id, user2_id) DO NOTHING
  RETURNING id INTO v_inserted_match_id;

  IF v_inserted_match_id IS NULL THEN
    SELECT id INTO v_match_id
    FROM public.matches
    WHERE user1_id = v_user1 AND user2_id = v_user2
    LIMIT 1;

    IF v_match_id IS NULL THEN
      RAISE EXCEPTION 'Impossibile aprire la chat';
    END IF;

    RETURN QUERY SELECT v_match_id, false;
    RETURN;
  END IF;

  SELECT
    balance,
    is_premium,
    subscription_type,
    premium_tier,
    premium_expires_at,
    COALESCE(daily_free_chats_remaining, 0),
    daily_free_chats_reset_at
  INTO
    v_balance,
    v_is_premium,
    v_subscription_type,
    v_premium_tier,
    v_premium_expires_at,
    v_free_chats,
    v_free_chats_reset_at
  FROM public.user_credits
  WHERE user_id = v_caller
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_DIRECT_CHAT_CREDITS';
  END IF;

  v_premium_active := COALESCE(v_is_premium, false)
    AND (v_premium_expires_at IS NULL OR now() < v_premium_expires_at);

  -- Premium monthly unlocks direct chats without credit deduction.
  IF v_premium_active
    AND v_subscription_type = 'monthly'
    AND (v_premium_tier IS NULL OR v_premium_tier = '' OR v_premium_tier = 'premium') THEN
    RETURN QUERY SELECT v_inserted_match_id, false;
    RETURN;
  END IF;

  -- Weekly uses the included daily free chats before paid credits.
  IF v_premium_active AND v_subscription_type = 'weekly' THEN
    IF v_free_chats_reset_at IS NULL OR now() >= v_free_chats_reset_at THEN
      v_free_chats := 5;
      v_free_chats_reset_at := now() + interval '24 hours';
    END IF;

    IF v_free_chats > 0 THEN
      UPDATE public.user_credits
      SET daily_free_chats_remaining = v_free_chats - 1,
          daily_free_chats_reset_at = v_free_chats_reset_at,
          updated_at = now()
      WHERE user_id = v_caller;

      RETURN QUERY SELECT v_inserted_match_id, false;
      RETURN;
    END IF;
  END IF;

  IF COALESCE(v_balance, 0) < 6 THEN
    RAISE EXCEPTION 'INSUFFICIENT_DIRECT_CHAT_CREDITS';
  END IF;

  UPDATE public.user_credits
  SET balance = balance - 6,
      updated_at = now()
  WHERE user_id = v_caller;

  -- Return false for was_created because this function already settled the cost.
  -- Older frontend clients only do client-side charging when was_created=true.
  RETURN QUERY SELECT v_inserted_match_id, false;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid) TO authenticated;
