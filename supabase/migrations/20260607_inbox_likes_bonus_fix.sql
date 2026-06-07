-- 🎁 FIX ricompense inbox: like regalati che spariscono + realtime.
--
-- Problema: i like regalati venivano sommati a user_credits.daily_likes_remaining,
-- ma sia check_and_reset_daily_likes che consume_daily_like ri-clampano quel
-- valore al massimo giornaliero (5 free / 10 settimanale / 20 platino). Quindi
-- i like extra sparivano alla prima lettura.
--
-- Soluzione: una colonna separata user_credits.bonus_likes che NON viene mai
-- clampata. I like regalati finiscono li'. Il totale mostrato/usabile diventa
-- daily_likes_remaining + bonus_likes. I bonus si consumano dopo i like giornalieri.

-- 1) Colonna bonus_likes (persistente, mai resettata dal ciclo giornaliero).
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS bonus_likes integer NOT NULL DEFAULT 0;

-- 2) Lettura/reset like: include i bonus nel totale restituito.
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_likes(_user_id uuid)
RETURNS TABLE(likes_remaining integer, reset_at timestamp with time zone, is_premium boolean, subscription_type text, premium_tier text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_likes integer;
  current_reset_at timestamp with time zone;
  user_is_premium boolean;
  user_premium_active boolean;
  user_sub_type text;
  user_tier text;
  expires_at timestamp with time zone;
  daily_limit integer;
  current_bonus integer;
BEGIN
  SELECT daily_likes_remaining, daily_likes_reset_at, user_credits.is_premium,
         user_credits.subscription_type, user_credits.premium_tier, user_credits.premium_expires_at,
         COALESCE(user_credits.bonus_likes, 0)
  INTO current_likes, current_reset_at, user_is_premium, user_sub_type, user_tier, expires_at, current_bonus
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  user_premium_active := user_is_premium AND (expires_at IS NULL OR now() < expires_at);

  IF user_premium_active THEN
    IF user_sub_type = 'monthly' AND user_tier = 'standard' THEN
      daily_limit := 20; -- Platino
    ELSIF user_sub_type = 'weekly' THEN
      daily_limit := 10; -- Settimanale
    ELSE
      daily_limit := 999999; -- Premium illimitato
    END IF;
  ELSE
    daily_limit := 5; -- Free
  END IF;

  IF current_reset_at IS NULL OR now() >= current_reset_at THEN
    current_reset_at := now() + interval '24 hours';
    current_likes := daily_limit;
  ELSIF current_likes > daily_limit THEN
    current_likes := daily_limit;
  END IF;

  -- I bonus NON vengono toccati dal ciclo giornaliero.
  UPDATE public.user_credits
  SET daily_likes_remaining = current_likes, daily_likes_reset_at = current_reset_at, updated_at = now()
  WHERE user_id = _user_id;

  -- Totale mostrato = like giornalieri + like bonus regalati.
  RETURN QUERY SELECT current_likes + current_bonus, current_reset_at, user_premium_active, user_sub_type, user_tier;
END;
$$;

-- 3) Consumo like: prima i giornalieri, poi i bonus, infine i crediti.
CREATE OR REPLACE FUNCTION public.consume_daily_like(_user_id uuid, _use_credits boolean DEFAULT false)
RETURNS TABLE(success boolean, likes_remaining integer, credits_used boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_likes integer;
  current_reset timestamp with time zone;
  premium_status boolean;
  premium_active boolean;
  sub_type text;
  tier text;
  expires_at timestamp with time zone;
  current_balance integer;
  max_likes integer;
  current_bonus integer;
BEGIN
  SELECT uc.daily_likes_remaining, uc.daily_likes_reset_at, uc.is_premium,
         uc.subscription_type, uc.premium_tier, uc.premium_expires_at, uc.balance,
         COALESCE(uc.bonus_likes, 0)
  INTO current_likes, current_reset, premium_status, sub_type, tier, expires_at, current_balance, current_bonus
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, false, 0;
    RETURN;
  END IF;

  premium_active := premium_status AND (expires_at IS NULL OR now() < expires_at);

  IF premium_active AND sub_type = 'monthly' AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN QUERY SELECT true, 999999, false, current_balance;
    RETURN;
  END IF;

  IF premium_active AND sub_type = 'monthly' AND tier = 'standard' THEN
    max_likes := 20; -- Platino
  ELSIF premium_active AND sub_type = 'weekly' THEN
    max_likes := 10; -- Settimanale
  ELSE
    max_likes := 5;  -- Free
  END IF;

  IF current_reset IS NULL OR now() >= current_reset THEN
    current_reset := now() + interval '24 hours';
    current_likes := max_likes;
  ELSIF current_likes > max_likes THEN
    current_likes := max_likes;
  END IF;

  -- 1) Like giornalieri disponibili.
  IF current_likes > 0 THEN
    UPDATE public.user_credits
    SET daily_likes_remaining = current_likes - 1, daily_likes_reset_at = current_reset, updated_at = now()
    WHERE user_id = _user_id;
    RETURN QUERY SELECT true, (current_likes - 1) + current_bonus, false, current_balance;
    RETURN;
  END IF;

  -- 2) Like bonus regalati (non clampati).
  IF current_bonus > 0 THEN
    UPDATE public.user_credits
    SET bonus_likes = current_bonus - 1, daily_likes_remaining = current_likes, daily_likes_reset_at = current_reset, updated_at = now()
    WHERE user_id = _user_id;
    RETURN QUERY SELECT true, current_likes + (current_bonus - 1), false, current_balance;
    RETURN;
  END IF;

  -- 3) Fallback crediti (2 crediti per like).
  IF _use_credits AND current_balance >= 2 THEN
    UPDATE public.user_credits SET balance = balance - 2, updated_at = now() WHERE user_id = _user_id;
    RETURN QUERY SELECT true, 0, true, current_balance - 2;
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET daily_likes_remaining = current_likes, daily_likes_reset_at = current_reset, updated_at = now()
  WHERE user_id = _user_id;
  RETURN QUERY SELECT false, current_bonus, false, current_balance;
END;
$$;

-- 4) Riscatto ricompensa: like regalati -> bonus_likes (NON daily_likes_remaining,
--    altrimenti verrebbero clampati). Crediti -> balance come prima.
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
        bonus_likes = COALESCE(bonus_likes, 0) + COALESCE(v_likes, 0),
        updated_at = now()
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance, daily_likes_remaining, bonus_likes)
    VALUES (v_uid, 10 + COALESCE(v_credits, 0), 5, COALESCE(v_likes, 0));
  END IF;

  RETURN QUERY SELECT COALESCE(v_credits, 0), COALESCE(v_likes, 0), false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_inbox_reward(uuid) TO authenticated;

-- 5) Realtime per l'inbox: i messaggi devono arrivare senza ricaricare.
ALTER TABLE public.inbox_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inbox_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
  END IF;
END$$;
