-- Aggiungi colonne per gestire abbonamento settimanale
ALTER TABLE public.user_credits
ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'none' CHECK (subscription_type IN ('none', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS has_used_weekly_trial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_free_chats_remaining integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_free_chats_reset_at timestamp with time zone DEFAULT NULL;

-- Aggiorna la funzione handle_new_user per includere i nuovi campi
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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
    id,
    full_name,
    nickname,
    age,
    birthdate,
    city,
    gender,
    sexual_orientation,
    relationship_status,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'Utente'),
    COALESCE(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
    v_age,
    v_birthdate,
    COALESCE(new.raw_user_meta_data->>'city', NULL),
    COALESCE(new.raw_user_meta_data->>'gender', NULL),
    COALESCE(new.raw_user_meta_data->>'sexual_orientation', NULL),
    COALESCE(new.raw_user_meta_data->>'relationship_status', NULL),
    now(),
    now()
  );
  
  INSERT INTO public.user_credits (
    user_id,
    balance,
    daily_likes_remaining,
    is_premium,
    subscription_type,
    has_used_weekly_trial,
    daily_free_chats_remaining
  )
  VALUES (
    new.id,
    26,
    8,
    false,
    'none',
    false,
    0
  );
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Aggiorna la funzione check_and_reset_daily_likes per gestire weekly premium
DROP FUNCTION IF EXISTS public.check_and_reset_daily_likes(uuid);

CREATE OR REPLACE FUNCTION public.check_and_reset_daily_likes(_user_id uuid)
RETURNS TABLE(likes_remaining integer, reset_at timestamp with time zone, is_premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_likes integer;
  current_reset timestamp with time zone;
  premium_status boolean;
  sub_type text;
BEGIN
  SELECT 
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium,
    uc.subscription_type
  INTO current_likes, current_reset, premium_status, sub_type
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  -- Se ha abbonamento mensile, ritorna likes illimitati
  IF premium_status AND sub_type = 'monthly' THEN
    RETURN QUERY SELECT 999, current_reset, premium_status;
    RETURN;
  END IF;

  -- Se ha abbonamento settimanale, max 30 likes al giorno
  IF premium_status AND sub_type = 'weekly' THEN
    IF current_reset IS NOT NULL AND NOW() >= current_reset THEN
      UPDATE public.user_credits
      SET 
        daily_likes_remaining = 30,
        daily_likes_reset_at = NULL
      WHERE user_id = _user_id;

      RETURN QUERY SELECT 30, NULL::timestamp with time zone, premium_status;
    ELSE
      RETURN QUERY SELECT current_likes, current_reset, premium_status;
    END IF;
    RETURN;
  END IF;

  -- Utenti free: 8 likes al giorno
  IF current_reset IS NOT NULL AND NOW() >= current_reset THEN
    UPDATE public.user_credits
    SET 
      daily_likes_remaining = 8,
      daily_likes_reset_at = NULL
    WHERE user_id = _user_id;

    RETURN QUERY SELECT 8, NULL::timestamp with time zone, premium_status;
  ELSE
    RETURN QUERY SELECT current_likes, current_reset, premium_status;
  END IF;
END;
$$;

-- Aggiorna consume_daily_like per gestire weekly
DROP FUNCTION IF EXISTS public.consume_daily_like(uuid, boolean);

CREATE OR REPLACE FUNCTION public.consume_daily_like(_user_id uuid, _use_credits boolean DEFAULT false)
RETURNS TABLE(success boolean, likes_remaining integer, credits_used boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_likes INTEGER;
  current_reset TIMESTAMP WITH TIME ZONE;
  premium_status BOOLEAN;
  sub_type TEXT;
  current_balance INTEGER;
  max_likes INTEGER;
BEGIN
  SELECT 
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium,
    uc.subscription_type,
    uc.balance
  INTO 
    current_likes,
    current_reset,
    premium_status,
    sub_type,
    current_balance
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, false, 0;
    RETURN;
  END IF;

  -- Monthly premium = illimitati
  IF premium_status AND sub_type = 'monthly' THEN
    RETURN QUERY SELECT true, 999, false, current_balance;
    RETURN;
  END IF;

  -- Weekly premium = 30 al giorno
  IF premium_status AND sub_type = 'weekly' THEN
    max_likes := 30;
  ELSE
    max_likes := 8;
  END IF;

  IF current_likes > 0 THEN
    IF current_reset IS NULL THEN
      current_reset := NOW() + INTERVAL '24 hours';
    END IF;

    UPDATE public.user_credits
    SET 
      daily_likes_remaining = daily_likes_remaining - 1,
      daily_likes_reset_at = current_reset
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, current_likes - 1, false, current_balance;
    RETURN;
  END IF;

  IF _use_credits AND current_balance >= 2 THEN
    UPDATE public.user_credits
    SET balance = balance - 2
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, 0, true, current_balance - 2;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 0, false, current_balance;
END;
$$;

-- Funzione per resettare le chat gratis giornaliere (weekly premium)
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_free_chats(_user_id uuid)
RETURNS TABLE(chats_remaining integer, reset_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_chats integer;
  current_reset timestamp with time zone;
  premium_status boolean;
  sub_type text;
BEGIN
  SELECT 
    uc.daily_free_chats_remaining,
    uc.daily_free_chats_reset_at,
    uc.is_premium,
    uc.subscription_type
  INTO current_chats, current_reset, premium_status, sub_type
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  -- Solo weekly premium ha questo benefit
  IF NOT premium_status OR sub_type != 'weekly' THEN
    RETURN QUERY SELECT 0, NULL::timestamp with time zone;
    RETURN;
  END IF;

  -- Reset se sono passate 24 ore
  IF current_reset IS NOT NULL AND NOW() >= current_reset THEN
    UPDATE public.user_credits
    SET 
      daily_free_chats_remaining = 5,
      daily_free_chats_reset_at = NULL
    WHERE user_id = _user_id;

    RETURN QUERY SELECT 5, NULL::timestamp with time zone;
  ELSE
    RETURN QUERY SELECT current_chats, current_reset;
  END IF;
END;
$$;

-- Funzione per consumare una chat gratis (weekly premium)
CREATE OR REPLACE FUNCTION public.consume_free_chat(_user_id uuid)
RETURNS TABLE(success boolean, chats_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_chats INTEGER;
  current_reset TIMESTAMP WITH TIME ZONE;
  premium_status BOOLEAN;
  sub_type TEXT;
BEGIN
  SELECT 
    uc.daily_free_chats_remaining,
    uc.daily_free_chats_reset_at,
    uc.is_premium,
    uc.subscription_type
  INTO 
    current_chats,
    current_reset,
    premium_status,
    sub_type
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Solo weekly premium
  IF NOT premium_status OR sub_type != 'weekly' THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF current_chats > 0 THEN
    IF current_reset IS NULL THEN
      current_reset := NOW() + INTERVAL '24 hours';
    END IF;

    UPDATE public.user_credits
    SET 
      daily_free_chats_remaining = daily_free_chats_remaining - 1,
      daily_free_chats_reset_at = current_reset
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, current_chats - 1;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 0;
END;
$$;

-- Aggiorna reset_daily_credits per gestire weekly
DROP FUNCTION IF EXISTS public.reset_daily_credits();

CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Resetta crediti per utenti free (balance < 26)
  UPDATE public.user_credits
  SET 
    balance = 26,
    last_daily_reset = NOW(),
    credits_depleted_at = NULL
  WHERE 
    is_premium = FALSE 
    AND balance < 26 
    AND credits_depleted_at IS NOT NULL
    AND NOW() - credits_depleted_at >= INTERVAL '24 hours';

  -- Resetta crediti per utenti weekly premium (balance < 40)
  UPDATE public.user_credits
  SET 
    balance = 40,
    last_daily_reset = NOW(),
    credits_depleted_at = NULL
  WHERE 
    is_premium = TRUE
    AND subscription_type = 'weekly'
    AND balance < 40 
    AND credits_depleted_at IS NOT NULL
    AND NOW() - credits_depleted_at >= INTERVAL '24 hours';
END;
$$;

-- Aggiorna check_and_reset_user_credits per weekly
DROP FUNCTION IF EXISTS public.check_and_reset_user_credits(uuid);

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
  depleted_at TIMESTAMP WITH TIME ZONE;
  last_reset TIMESTAMP WITH TIME ZONE;
  target_balance INTEGER;
BEGIN
  SELECT 
    uc.balance, 
    uc.is_premium,
    uc.subscription_type,
    uc.credits_depleted_at,
    uc.last_daily_reset
  INTO 
    current_balance, 
    current_premium,
    sub_type,
    depleted_at,
    last_reset
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determina il balance target
  IF current_premium AND sub_type = 'monthly' THEN
    -- Monthly non ha limiti di crediti
    RETURN QUERY SELECT current_balance, current_premium, last_reset;
    RETURN;
  ELSIF current_premium AND sub_type = 'weekly' THEN
    target_balance := 40;
  ELSE
    target_balance := 26;
  END IF;

  -- Imposta depleted_at se necessario
  IF current_balance < target_balance AND depleted_at IS NULL THEN
    UPDATE public.user_credits
    SET credits_depleted_at = NOW()
    WHERE user_id = _user_id;
    
    depleted_at := NOW();
  END IF;

  -- Reset se sono passate 24 ore
  IF current_balance < target_balance AND depleted_at IS NOT NULL AND 
     NOW() - depleted_at >= INTERVAL '24 hours' THEN
    
    UPDATE public.user_credits
    SET 
      balance = target_balance,
      last_daily_reset = NOW(),
      credits_depleted_at = NULL
    WHERE user_id = _user_id;

    RETURN QUERY SELECT target_balance, current_premium, NOW();
  ELSE
    RETURN QUERY SELECT current_balance, current_premium, last_reset;
  END IF;
END;
$$;