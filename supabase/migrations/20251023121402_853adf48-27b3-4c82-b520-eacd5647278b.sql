-- Add daily likes tracking to user_credits table
ALTER TABLE public.user_credits
ADD COLUMN IF NOT EXISTS daily_likes_remaining integer NOT NULL DEFAULT 13,
ADD COLUMN IF NOT EXISTS daily_likes_reset_at timestamp with time zone DEFAULT NULL;

-- Function to check and reset daily likes if needed
CREATE OR REPLACE FUNCTION public.check_and_reset_daily_likes(_user_id uuid)
RETURNS TABLE(likes_remaining integer, reset_at timestamp with time zone, is_premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_likes INTEGER;
  current_reset TIMESTAMP WITH TIME ZONE;
  premium_status BOOLEAN;
BEGIN
  -- Get current likes info
  SELECT 
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium
  INTO 
    current_likes,
    current_reset,
    premium_status
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  -- If user not found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Premium users have unlimited likes
  IF premium_status THEN
    RETURN QUERY SELECT 999, current_reset, premium_status;
    RETURN;
  END IF;

  -- Check if 24 hours have passed since reset_at
  IF current_reset IS NOT NULL AND NOW() >= current_reset THEN
    -- Reset likes to 13
    UPDATE public.user_credits
    SET 
      daily_likes_remaining = 13,
      daily_likes_reset_at = NULL
    WHERE user_id = _user_id;

    RETURN QUERY SELECT 13, NULL::timestamp with time zone, premium_status;
  ELSE
    RETURN QUERY SELECT current_likes, current_reset, premium_status;
  END IF;
END;
$$;

-- Function to consume a daily like
CREATE OR REPLACE FUNCTION public.consume_daily_like(_user_id uuid, _use_credits boolean DEFAULT false)
RETURNS TABLE(success boolean, likes_remaining integer, credits_used boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_likes INTEGER;
  current_reset TIMESTAMP WITH TIME ZONE;
  premium_status BOOLEAN;
  current_balance INTEGER;
BEGIN
  -- Get current status
  SELECT 
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium,
    uc.balance
  INTO 
    current_likes,
    current_reset,
    premium_status,
    current_balance
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  -- If user not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, false, 0;
    RETURN;
  END IF;

  -- Premium users have unlimited likes
  IF premium_status THEN
    RETURN QUERY SELECT true, 999, false, current_balance;
    RETURN;
  END IF;

  -- If user has likes remaining
  IF current_likes > 0 THEN
    -- Set reset time on first like if not set
    IF current_reset IS NULL THEN
      current_reset := NOW() + INTERVAL '24 hours';
    END IF;

    -- Consume one like
    UPDATE public.user_credits
    SET 
      daily_likes_remaining = daily_likes_remaining - 1,
      daily_likes_reset_at = current_reset
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, current_likes - 1, false, current_balance;
    RETURN;
  END IF;

  -- If no likes left, try to use credits
  IF _use_credits AND current_balance >= 2 THEN
    UPDATE public.user_credits
    SET balance = balance - 2
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, 0, true, current_balance - 2;
    RETURN;
  END IF;

  -- No likes and insufficient credits
  RETURN QUERY SELECT false, 0, false, current_balance;
END;
$$;