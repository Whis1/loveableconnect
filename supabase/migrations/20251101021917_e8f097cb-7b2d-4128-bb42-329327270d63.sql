-- Update: deduct 2 credits per sent message; only monthly premium is free
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
BEGIN
  SELECT balance, is_premium, credits_depleted_at, subscription_type 
  INTO current_balance, is_premium_user, current_depleted_at, sub_type
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Monthly premium messages are free
  IF is_premium_user AND sub_type = 'monthly' THEN
    RETURN TRUE;
  END IF;

  -- Charge 2 credits per message
  IF current_balance < 2 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_credits
  SET 
    balance = balance - 2,
    -- Mark depletion start when crossing plan daily target for the first time
    credits_depleted_at = CASE 
      WHEN (sub_type = 'weekly' AND balance - 2 < 40 AND current_depleted_at IS NULL) THEN NOW()
      WHEN ((sub_type IS NULL OR sub_type = 'none' OR sub_type = '') AND balance - 2 < 16 AND current_depleted_at IS NULL) THEN NOW()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$function$;