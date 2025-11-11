-- Fix: make only monthly premium_tier='premium' unlimited; monthly 'standard' should be charged

-- Update deduct_credits to respect premium_tier
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  is_premium_user BOOLEAN;
  sub_type TEXT;
  tier TEXT;
BEGIN
  SELECT balance, is_premium, subscription_type, premium_tier
  INTO current_balance, is_premium_user, sub_type, tier
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Only monthly with premium tier is unlimited (no charge)
  IF is_premium_user AND sub_type = 'monthly' AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN TRUE;
  END IF;

  -- Check sufficient credits
  IF current_balance < _amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct credits
  UPDATE public.user_credits
  SET balance = balance - _amount
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$function$;

-- Update deduct_message_credits to respect premium_tier and set depletion thresholds per plan
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
  sub_type TEXT;
  tier TEXT;
BEGIN
  SELECT balance, is_premium, credits_depleted_at, subscription_type, premium_tier
  INTO current_balance, is_premium_user, current_depleted_at, sub_type, tier
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Only monthly with premium tier has free messages (unlimited)
  IF is_premium_user AND sub_type = 'monthly' AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN TRUE;
  END IF;

  -- Charge 2 credits per message for all other plans (including monthly standard & weekly)
  IF current_balance < 2 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_credits
  SET 
    balance = balance - 2,
    -- Mark depletion start when crossing plan daily target for the first time
    credits_depleted_at = CASE 
      WHEN (sub_type = 'monthly' AND tier = 'standard' AND balance - 2 < 70 AND current_depleted_at IS NULL) THEN NOW()
      WHEN (sub_type = 'weekly' AND balance - 2 < 40 AND current_depleted_at IS NULL) THEN NOW()
      WHEN ((sub_type IS NULL OR sub_type = 'none' OR sub_type = '') AND balance - 2 < 16 AND current_depleted_at IS NULL) THEN NOW()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$function$;