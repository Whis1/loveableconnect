-- 🎁 Inbox con ricompensa riscattabile (crediti/like) allegata ai messaggi.

-- 1) Colonne ricompensa sui messaggi inbox.
ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS reward_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_likes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_claimed boolean NOT NULL DEFAULT false;

-- 2) "Invia a tutti" ora accetta crediti/like in regalo (sostituisce la
--    versione a 1 argomento per evitare ambiguita').
DROP FUNCTION IF EXISTS public.send_inbox_to_all(text);
CREATE OR REPLACE FUNCTION public.send_inbox_to_all(
  p_message text,
  p_credits integer DEFAULT 0,
  p_likes integer DEFAULT 0
)
RETURNS TABLE (batch_id uuid, count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_email text;
  v_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  INSERT INTO inbox_messages (user_id, message, batch_id, reward_credits, reward_likes)
  SELECT p.id, p_message, v_batch,
         GREATEST(COALESCE(p_credits, 0), 0),
         GREATEST(COALESCE(p_likes, 0), 0)
  FROM profiles p
  WHERE p.is_admin_profile = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  DELETE FROM admin_user_actions WHERE created_at < now() - interval '48 hours';
  INSERT INTO admin_user_actions (admin_id, admin_email, action_type, message, batch_id)
  VALUES (auth.uid(), v_email, 'inbox_all', p_message, v_batch);

  RETURN QUERY SELECT v_batch, v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_inbox_to_all(text, integer, integer) TO authenticated;

-- 3) Riscatto della ricompensa: atomico, idempotente, solo sul proprio messaggio.
CREATE OR REPLACE FUNCTION public.claim_inbox_reward(p_message_id uuid)
RETURNS TABLE(credits integer, likes integer, already boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_credits int;
  v_likes int;
  v_claimed boolean;
BEGIN
  SELECT reward_credits, reward_likes, reward_claimed
    INTO v_credits, v_likes, v_claimed
  FROM inbox_messages
  WHERE id = p_message_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, false; RETURN;
  END IF;
  IF v_claimed THEN
    RETURN QUERY SELECT COALESCE(v_credits, 0), COALESCE(v_likes, 0), true; RETURN;
  END IF;
  IF COALESCE(v_credits, 0) <= 0 AND COALESCE(v_likes, 0) <= 0 THEN
    RETURN QUERY SELECT 0, 0, false; RETURN;
  END IF;

  UPDATE inbox_messages SET reward_claimed = true WHERE id = p_message_id;

  UPDATE user_credits
    SET balance = balance + COALESCE(v_credits, 0),
        daily_likes_remaining = COALESCE(daily_likes_remaining, 0) + COALESCE(v_likes, 0),
        updated_at = now()
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance, daily_likes_remaining)
    VALUES (v_uid, 10 + COALESCE(v_credits, 0), 5 + COALESCE(v_likes, 0));
  END IF;

  RETURN QUERY SELECT COALESCE(v_credits, 0), COALESCE(v_likes, 0), false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_inbox_reward(uuid) TO authenticated;
