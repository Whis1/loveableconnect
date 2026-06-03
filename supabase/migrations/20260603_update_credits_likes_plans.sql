-- =============================================================================
-- AGGIORNAMENTO CREDITI E LIKE GIORNALIERI PER PIANO
-- =============================================================================
-- Nuovi valori:
--   Free      : 10 crediti / 5 like  (anche nuovo utente parte con 10/5)
--   Settimanale: 26 crediti / 10 like
--   Platino   : 40 crediti / 20 like
--   Premium mensile: illimitato (invariato)
-- Aggiorna le funzioni di reset/consumo + i default colonna + il trigger di
-- registrazione nuovo utente.
-- =============================================================================

-- Default colonna (usati solo se un INSERT non specifica i valori)
ALTER TABLE public.user_credits ALTER COLUMN balance SET DEFAULT 10;
ALTER TABLE public.user_credits ALTER COLUMN daily_likes_remaining SET DEFAULT 5;

-- -----------------------------------------------------------------------------
-- check_and_reset_user_credits: reset crediti giornalieri per piano
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_reset_user_credits(_user_id uuid)
RETURNS TABLE(balance integer, is_premium boolean, last_daily_reset timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_balance INTEGER;
  current_premium BOOLEAN;
  sub_type TEXT;
  tier TEXT;
  depleted_at TIMESTAMP WITH TIME ZONE;
  last_reset TIMESTAMP WITH TIME ZONE;
  target_balance INTEGER;
  premium_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT uc.balance, uc.is_premium, uc.subscription_type, uc.premium_tier,
         uc.credits_depleted_at, uc.last_daily_reset, uc.premium_expires_at
  INTO current_balance, current_premium, sub_type, tier, depleted_at, last_reset, premium_expires
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Premium scaduto → torna a free (10 crediti / 5 like)
  IF current_premium AND premium_expires IS NOT NULL AND NOW() >= premium_expires THEN
    UPDATE public.user_credits
    SET is_premium = false, subscription_type = 'none', premium_tier = 'none',
        balance = 10, daily_likes_remaining = 5, daily_free_chats_remaining = 0,
        daily_likes_reset_at = NULL, daily_free_chats_reset_at = NULL,
        credits_depleted_at = NULL, last_daily_reset = NOW()
    WHERE user_id = _user_id;
    RETURN QUERY SELECT 10, false, NOW();
    RETURN;
  END IF;

  -- Target crediti in base al piano
  IF current_premium AND sub_type = 'monthly' THEN
    IF tier = 'premium' THEN
      RETURN QUERY SELECT current_balance, current_premium, last_reset; -- illimitato
      RETURN;
    ELSIF tier = 'standard' THEN
      target_balance := 40; -- Platino
    ELSE
      RETURN QUERY SELECT current_balance, current_premium, last_reset;
      RETURN;
    END IF;
  ELSIF current_premium AND sub_type = 'weekly' THEN
    target_balance := 26; -- Settimanale
  ELSE
    target_balance := 10; -- Free
  END IF;

  IF current_balance < target_balance AND depleted_at IS NULL THEN
    UPDATE public.user_credits SET credits_depleted_at = NOW() WHERE user_id = _user_id;
    depleted_at := NOW();
  END IF;

  IF current_balance < target_balance AND depleted_at IS NOT NULL AND
     NOW() - depleted_at >= INTERVAL '24 hours' THEN
    UPDATE public.user_credits
    SET balance = target_balance, last_daily_reset = NOW(), credits_depleted_at = NULL
    WHERE user_id = _user_id;
    RETURN QUERY SELECT target_balance, current_premium, NOW();
  ELSE
    RETURN QUERY SELECT current_balance, current_premium, last_reset;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- check_and_reset_daily_likes: reset like giornalieri per piano
-- -----------------------------------------------------------------------------
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
BEGIN
  SELECT daily_likes_remaining, daily_likes_reset_at, user_credits.is_premium,
         user_credits.subscription_type, user_credits.premium_tier, user_credits.premium_expires_at
  INTO current_likes, current_reset_at, user_is_premium, user_sub_type, user_tier, expires_at
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

  UPDATE public.user_credits
  SET daily_likes_remaining = current_likes, daily_likes_reset_at = current_reset_at, updated_at = now()
  WHERE user_id = _user_id;

  RETURN QUERY SELECT current_likes, current_reset_at, user_premium_active, user_sub_type, user_tier;
END;
$$;

-- -----------------------------------------------------------------------------
-- consume_daily_like: consuma un like (con limiti per piano)
-- -----------------------------------------------------------------------------
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
BEGIN
  SELECT uc.daily_likes_remaining, uc.daily_likes_reset_at, uc.is_premium,
         uc.subscription_type, uc.premium_tier, uc.premium_expires_at, uc.balance
  INTO current_likes, current_reset, premium_status, sub_type, tier, expires_at, current_balance
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

  IF current_likes > 0 THEN
    UPDATE public.user_credits
    SET daily_likes_remaining = current_likes - 1, daily_likes_reset_at = current_reset, updated_at = now()
    WHERE user_id = _user_id;
    RETURN QUERY SELECT true, current_likes - 1, false, current_balance;
    RETURN;
  END IF;

  IF _use_credits AND current_balance >= 2 THEN
    UPDATE public.user_credits SET balance = balance - 2, updated_at = now() WHERE user_id = _user_id;
    RETURN QUERY SELECT true, 0, true, current_balance - 2;
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET daily_likes_remaining = current_likes, daily_likes_reset_at = current_reset, updated_at = now()
  WHERE user_id = _user_id;
  RETURN QUERY SELECT false, 0, false, current_balance;
END;
$$;

-- -----------------------------------------------------------------------------
-- deduct_message_credits: -2 crediti a messaggio + soglie "depleted" per piano
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_message_credits(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance integer;
  is_premium_user boolean;
  premium_active boolean;
  current_depleted_at timestamp with time zone;
  sub_type text;
  tier text;
  expires_at timestamp with time zone;
BEGIN
  SELECT balance, is_premium, credits_depleted_at, subscription_type, premium_tier, premium_expires_at
  INTO current_balance, is_premium_user, current_depleted_at, sub_type, tier, expires_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  premium_active := is_premium_user AND (expires_at IS NULL OR now() < expires_at);

  IF premium_active AND sub_type = 'monthly' AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN true; -- premium: messaggi illimitati
  END IF;

  IF current_balance < 2 THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET balance = balance - 2, updated_at = now(),
      credits_depleted_at = CASE
        WHEN (premium_active AND sub_type = 'monthly' AND tier = 'standard' AND balance - 2 < 40 AND current_depleted_at IS NULL) THEN now()
        WHEN (premium_active AND sub_type = 'weekly' AND balance - 2 < 26 AND current_depleted_at IS NULL) THEN now()
        WHEN ((NOT premium_active OR sub_type IS NULL OR sub_type = 'none' OR sub_type = '') AND balance - 2 < 10 AND current_depleted_at IS NULL) THEN now()
        ELSE credits_depleted_at
      END
  WHERE user_id = _user_id;

  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- handle_new_user: il nuovo utente parte con 10 crediti / 5 like
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_birthdate DATE;
  v_age INTEGER;
BEGIN
  v_birthdate := (new.raw_user_meta_data->>'birthdate')::date;
  IF v_birthdate IS NOT NULL THEN
    v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_birthdate));
  ELSE
    v_age := COALESCE((new.raw_user_meta_data->>'age')::integer, NULL);
  END IF;

  INSERT INTO public.profiles (
    id, full_name, nickname, age, birthdate, city, gender,
    sexual_orientation, relationship_status, created_at, updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'Utente'),
    COALESCE(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
    v_age, v_birthdate,
    COALESCE(new.raw_user_meta_data->>'city', NULL),
    COALESCE(new.raw_user_meta_data->>'gender', NULL),
    COALESCE(new.raw_user_meta_data->>'sexual_orientation', NULL),
    COALESCE(new.raw_user_meta_data->>'relationship_status', NULL),
    now(), now()
  );

  INSERT INTO public.user_credits (
    user_id, balance, daily_likes_remaining, is_premium,
    subscription_type, has_used_weekly_trial, daily_free_chats_remaining
  )
  VALUES (new.id, 10, 5, false, 'none', false, 0);

  RETURN new;
END;
$$;
