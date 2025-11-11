-- Drop and recreate check_and_reset_daily_likes to return subscription_type and premium_tier
DROP FUNCTION IF EXISTS public.check_and_reset_daily_likes(uuid);

CREATE OR REPLACE FUNCTION public.check_and_reset_daily_likes(_user_id uuid)
RETURNS TABLE(
  likes_remaining integer,
  reset_at timestamp with time zone,
  is_premium boolean,
  subscription_type text,
  premium_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_likes integer;
  current_reset_at timestamp with time zone;
  user_is_premium boolean;
  user_sub_type text;
  user_tier text;
  daily_limit integer;
BEGIN
  -- Get current user credits info
  SELECT 
    daily_likes_remaining, 
    daily_likes_reset_at, 
    user_credits.is_premium,
    user_credits.subscription_type,
    user_credits.premium_tier
  INTO current_likes, current_reset_at, user_is_premium, user_sub_type, user_tier
  FROM user_credits
  WHERE user_id = _user_id;

  -- Determina il limite giornaliero in base al tipo di abbonamento e tier
  IF user_is_premium THEN
    IF user_sub_type = 'monthly' AND (user_tier = 'standard') THEN
      daily_limit := 40; -- Platino mensile
    ELSIF user_sub_type = 'weekly' THEN
      daily_limit := 30; -- Weekly premium
    ELSE
      daily_limit := 999999; -- Premium illimitato (monthly con tier premium o null)
    END IF;
  ELSE
    daily_limit := 8; -- Free
  END IF;

  -- Se non esiste ancora un reset, crealo
  IF current_reset_at IS NULL THEN
    current_reset_at := NOW() + INTERVAL '24 hours';
    UPDATE user_credits
    SET daily_likes_reset_at = current_reset_at,
        daily_likes_remaining = daily_limit
    WHERE user_id = _user_id;
    current_likes := daily_limit;
  -- Se il reset è scaduto, resetta i like
  ELSIF NOW() >= current_reset_at THEN
    current_reset_at := NOW() + INTERVAL '24 hours';
    UPDATE user_credits
    SET daily_likes_remaining = daily_limit,
        daily_likes_reset_at = current_reset_at
    WHERE user_id = _user_id;
    current_likes := daily_limit;
  END IF;

  RETURN QUERY SELECT current_likes, current_reset_at, user_is_premium, user_sub_type, user_tier;
END;
$function$;