-- Update daily likes limit from 13 to 8

-- Update default value for daily_likes_remaining column
ALTER TABLE public.user_credits
ALTER COLUMN daily_likes_remaining SET DEFAULT 8;

-- Update existing users' daily likes to 8 (if they still have 13)
UPDATE public.user_credits
SET daily_likes_remaining = 8
WHERE daily_likes_remaining = 13;

-- Update the check_and_reset_daily_likes function to use 8 instead of 13
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_likes(_user_id uuid)
RETURNS TABLE(likes_remaining integer, reset_at timestamp with time zone, is_premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_likes integer;
  current_reset timestamp with time zone;
  premium_status boolean;
BEGIN
  -- Get current likes and reset time
  SELECT 
    daily_likes_remaining,
    daily_likes_reset_at,
    is_premium
  INTO current_likes, current_reset, premium_status
  FROM public.user_credits
  WHERE user_id = _user_id;

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