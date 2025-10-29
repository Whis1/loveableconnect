-- Fix ambiguous column reference in check_and_reset_daily_likes
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
BEGIN
  -- Get current likes and reset time
  SELECT 
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium
  INTO current_likes, current_reset, premium_status
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  -- If premium, return unlimited likes (999)
  IF premium_status THEN
    RETURN QUERY SELECT 999, current_reset, premium_status;
    RETURN;
  END IF;

  -- Check if 24 hours have passed since reset_at
  IF current_reset IS NOT NULL AND NOW() >= current_reset THEN
    -- Reset likes to 8
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