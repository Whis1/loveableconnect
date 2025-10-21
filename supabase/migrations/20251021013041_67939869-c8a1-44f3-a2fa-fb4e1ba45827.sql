-- Add column to track when user first went below 40 credits
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS credits_depleted_at TIMESTAMP WITH TIME ZONE;

-- Drop and recreate check_and_reset_user_credits with new signature
DROP FUNCTION IF EXISTS public.check_and_reset_user_credits(uuid);

CREATE FUNCTION public.check_and_reset_user_credits(_user_id UUID)
RETURNS TABLE(balance INTEGER, is_premium BOOLEAN, last_daily_reset TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  current_balance INTEGER;
  current_premium BOOLEAN;
  depleted_at TIMESTAMP WITH TIME ZONE;
  last_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current user credits info
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

  -- If user not found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if 24 hours have passed since credits_depleted_at
  -- Only reset if balance is below 40 and 24 hours have passed
  IF current_balance < 40 AND depleted_at IS NOT NULL AND 
     NOW() - depleted_at >= INTERVAL '24 hours' THEN
    
    -- Reset credits to 40
    UPDATE public.user_credits
    SET 
      balance = 40,
      last_daily_reset = NOW(),
      credits_depleted_at = NULL
    WHERE user_id = _user_id;

    -- Return updated values
    RETURN QUERY SELECT 40, current_premium, NOW();
  ELSE
    -- Return current values
    RETURN QUERY SELECT current_balance, current_premium, last_reset;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update deduct_message_credits function to track when credits go below 40
CREATE OR REPLACE FUNCTION public.deduct_message_credits(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  is_premium_user BOOLEAN;
  current_depleted_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current balance and premium status
  SELECT balance, is_premium, credits_depleted_at 
  INTO current_balance, is_premium_user, current_depleted_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  -- If user doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Premium users don't consume credits
  IF is_premium_user THEN
    RETURN TRUE;
  END IF;

  -- Check if user has enough credits
  IF current_balance < 2 THEN
    RETURN FALSE;
  END IF;

  -- Deduct credits
  UPDATE public.user_credits
  SET 
    balance = balance - 2,
    -- Set credits_depleted_at if going below 40 for the first time
    credits_depleted_at = CASE 
      WHEN balance - 2 < 40 AND current_depleted_at IS NULL 
      THEN NOW()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reset_daily_credits to reset credits_depleted_at
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_credits
  SET 
    balance = 40,
    last_daily_reset = NOW(),
    credits_depleted_at = NULL
  WHERE 
    is_premium = FALSE 
    AND balance < 40 
    AND credits_depleted_at IS NOT NULL
    AND NOW() - credits_depleted_at >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;