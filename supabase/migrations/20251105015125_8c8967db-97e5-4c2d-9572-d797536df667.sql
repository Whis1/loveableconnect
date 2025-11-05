-- Update check_and_reset_daily_likes to remove unlimited likes for weekly subscribers
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

  -- Only monthly premium gets unlimited likes (999)
  IF premium_status AND sub_type = 'monthly' THEN
    RETURN QUERY SELECT 999, current_reset, premium_status;
    RETURN;
  END IF;

  -- Weekly premium: 30 likes per day
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

  -- Free users: 8 likes per day
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