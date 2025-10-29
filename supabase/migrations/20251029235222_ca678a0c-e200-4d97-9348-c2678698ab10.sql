-- Aggiorna il valore di default dei crediti da 26 a 16
ALTER TABLE public.user_credits ALTER COLUMN balance SET DEFAULT 16;

-- Aggiorna la funzione handle_new_user per inizializzare con 16 crediti
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    16,
    8,
    false,
    'none',
    false,
    0
  );
  
  RETURN new;
END;
$function$;

-- Aggiorna la funzione reset_daily_credits per resettare a 16 crediti
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Resetta crediti per utenti free (balance < 16)
  UPDATE public.user_credits
  SET 
    balance = 16,
    last_daily_reset = NOW(),
    credits_depleted_at = NULL
  WHERE 
    is_premium = FALSE 
    AND balance < 16 
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
$function$;

-- Aggiorna la funzione check_and_reset_user_credits
CREATE OR REPLACE FUNCTION public.check_and_reset_user_credits(_user_id uuid)
 RETURNS TABLE(balance integer, is_premium boolean, last_daily_reset timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    target_balance := 16;
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
$function$;

-- Aggiorna la funzione deduct_message_credits per il nuovo limite
CREATE OR REPLACE FUNCTION public.deduct_message_credits(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  is_premium_user BOOLEAN;
  current_depleted_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT balance, is_premium, credits_depleted_at 
  INTO current_balance, is_premium_user, current_depleted_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF is_premium_user THEN
    RETURN TRUE;
  END IF;

  IF current_balance < 2 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_credits
  SET 
    balance = balance - 2,
    credits_depleted_at = CASE 
      WHEN balance - 2 < 16 AND current_depleted_at IS NULL 
      THEN NOW()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$function$;

-- Aggiorna il trigger reset_credits_depleted_on_recharge
CREATE OR REPLACE FUNCTION public.reset_credits_depleted_on_recharge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se i crediti passano da sotto 16 a sopra/uguale a 16, resetta credits_depleted_at
  IF (OLD.balance < 16 AND NEW.balance >= 16) THEN
    NEW.credits_depleted_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;