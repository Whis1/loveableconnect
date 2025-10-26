-- Aggiorna la funzione check_and_reset_user_credits per impostare credits_depleted_at automaticamente
CREATE OR REPLACE FUNCTION public.check_and_reset_user_credits(_user_id uuid)
RETURNS TABLE(balance integer, is_premium boolean, last_daily_reset timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  current_premium BOOLEAN;
  depleted_at TIMESTAMP WITH TIME ZONE;
  last_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT 
    uc.balance, 
    uc.is_premium,
    uc.credits_depleted_at,
    uc.last_daily_reset
  INTO 
    current_balance, 
    current_premium,
    depleted_at,
    last_reset
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Se i crediti sono sotto 26 e credits_depleted_at è null, lo impostiamo ora
  IF current_balance < 26 AND depleted_at IS NULL THEN
    UPDATE public.user_credits
    SET credits_depleted_at = NOW()
    WHERE user_id = _user_id;
    
    depleted_at := NOW();
  END IF;

  -- Se sono passate 24 ore da credits_depleted_at, resettiamo a 26
  IF current_balance < 26 AND depleted_at IS NOT NULL AND 
     NOW() - depleted_at >= INTERVAL '24 hours' THEN
    
    UPDATE public.user_credits
    SET 
      balance = 26,
      last_daily_reset = NOW(),
      credits_depleted_at = NULL
    WHERE user_id = _user_id;

    RETURN QUERY SELECT 26, current_premium, NOW();
  ELSE
    RETURN QUERY SELECT current_balance, current_premium, last_reset;
  END IF;
END;
$function$;

-- Aggiorna la funzione reset_daily_credits per dare 26 crediti
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
END;
$function$;

-- Aggiorna la funzione deduct_message_credits per impostare credits_depleted_at quando si scende sotto 26
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
      WHEN balance - 2 < 26 AND current_depleted_at IS NULL 
      THEN NOW()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$function$;

-- Aggiorna la funzione handle_new_user per dare 26 crediti iniziali
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    nickname,
    age,
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
    COALESCE((new.raw_user_meta_data->>'age')::integer, NULL),
    COALESCE(new.raw_user_meta_data->>'city', NULL),
    COALESCE(new.raw_user_meta_data->>'gender', NULL),
    COALESCE(new.raw_user_meta_data->>'sexual_orientation', NULL),
    COALESCE(new.raw_user_meta_data->>'relationship_status', NULL),
    now(),
    now()
  );
  
  -- Crea anche il record dei crediti per il nuovo utente con 26 crediti
  INSERT INTO public.user_credits (
    user_id,
    balance,
    daily_likes_remaining,
    is_premium
  )
  VALUES (
    new.id,
    26,
    13,
    false
  );
  
  RETURN new;
END;
$function$;