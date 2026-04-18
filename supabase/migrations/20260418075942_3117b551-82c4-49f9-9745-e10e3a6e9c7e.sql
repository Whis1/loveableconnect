CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id uuid)
RETURNS TABLE(match_id uuid, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_user1 uuid;
  v_user2 uuid;
  v_match_id uuid;
  v_created boolean := false;
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

  IF v_match_id IS NULL THEN
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
      SELECT id INTO v_match_id
      FROM public.matches
      WHERE user1_id = v_user1 AND user2_id = v_user2
      LIMIT 1;
    ELSE
      v_created := true;
    END IF;
  END IF;

  RETURN QUERY SELECT v_match_id, v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid) TO authenticated;