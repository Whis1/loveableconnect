-- Update check_and_reset_user_credits to handle standard monthly tier
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
  SELECT 
    uc.balance, 
    uc.is_premium,
    uc.subscription_type,
    uc.premium_tier,
    uc.credits_depleted_at,
    uc.last_daily_reset,
    uc.premium_expires_at
  INTO 
    current_balance, 
    current_premium,
    sub_type,
    tier,
    depleted_at,
    last_reset,
    premium_expires
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if premium expired and reset to free plan
  IF current_premium AND premium_expires IS NOT NULL AND NOW() >= premium_expires THEN
    UPDATE public.user_credits
    SET 
      is_premium = false,
      subscription_type = 'none',
      premium_tier = 'none',
      balance = 16,
      daily_likes_remaining = 8,
      daily_free_chats_remaining = 0,
      daily_likes_reset_at = NULL,
      daily_free_chats_reset_at = NULL,
      credits_depleted_at = NULL,
      last_daily_reset = NOW()
    WHERE user_id = _user_id;

    RETURN QUERY SELECT 16, false, NOW();
    RETURN;
  END IF;

  -- Determine target balance based on subscription
  IF current_premium AND sub_type = 'monthly' THEN
    IF tier = 'premium' THEN
      -- Premium tier: unlimited credits (no limits)
      RETURN QUERY SELECT current_balance, current_premium, last_reset;
      RETURN;
    ELSIF tier = 'standard' THEN
      -- Standard tier: 70 credits per day
      target_balance := 70;
    ELSE
      -- Old monthly subscriptions without tier default to premium
      RETURN QUERY SELECT current_balance, current_premium, last_reset;
      RETURN;
    END IF;
  ELSIF current_premium AND sub_type = 'weekly' THEN
    target_balance := 40;
  ELSE
    target_balance := 16;
  END IF;

  -- Set depleted_at if necessary
  IF current_balance < target_balance AND depleted_at IS NULL THEN
    UPDATE public.user_credits
    SET credits_depleted_at = NOW()
    WHERE user_id = _user_id;
    
    depleted_at := NOW();
  END IF;

  -- Reset if 24 hours passed
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

-- Update consume_daily_like to handle standard monthly tier
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
  tier TEXT;
  current_balance INTEGER;
  max_likes INTEGER;
BEGIN
  SELECT 
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium,
    uc.subscription_type,
    uc.premium_tier,
    uc.balance
  INTO 
    current_likes,
    current_reset,
    premium_status,
    sub_type,
    tier,
    current_balance
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, false, 0;
    RETURN;
  END IF;

  -- Monthly premium tier = unlimited likes
  IF premium_status AND sub_type = 'monthly' AND tier = 'premium' THEN
    RETURN QUERY SELECT true, 999, false, current_balance;
    RETURN;
  END IF;

  -- Monthly standard tier = 40 likes per day
  IF premium_status AND sub_type = 'monthly' AND tier = 'standard' THEN
    max_likes := 40;
  -- Weekly premium = 30 likes per day
  ELSIF premium_status AND sub_type = 'weekly' THEN
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