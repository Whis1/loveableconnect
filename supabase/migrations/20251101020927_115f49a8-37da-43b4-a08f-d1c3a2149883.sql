-- Aggiorna la funzione check_and_reset_user_credits per gestire la scadenza del premium
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
  premium_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT 
    uc.balance, 
    uc.is_premium,
    uc.subscription_type,
    uc.credits_depleted_at,
    uc.last_daily_reset,
    uc.premium_expires_at
  INTO 
    current_balance, 
    current_premium,
    sub_type,
    depleted_at,
    last_reset,
    premium_expires
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Controlla se il premium è scaduto e resetta al piano free
  IF current_premium AND premium_expires IS NOT NULL AND NOW() >= premium_expires THEN
    UPDATE public.user_credits
    SET 
      is_premium = false,
      subscription_type = 'none',
      balance = 16,
      daily_likes_remaining = 8,
      daily_free_chats_remaining = 0,
      daily_likes_reset_at = NULL,
      daily_free_chats_reset_at = NULL,
      credits_depleted_at = NULL,
      last_daily_reset = NOW()
    WHERE user_id = _user_id;

    -- Ritorna i valori del piano free
    RETURN QUERY SELECT 16, false, NOW();
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