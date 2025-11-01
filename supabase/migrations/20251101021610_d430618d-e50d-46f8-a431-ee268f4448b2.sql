-- Fix: charge weekly premium credits for chat unlock; only monthly premium is free
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
BEGIN
  SELECT balance, is_premium, subscription_type 
  INTO current_balance, is_premium_user, sub_type
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Monthly premium does not pay
  IF is_premium_user AND sub_type = 'monthly' THEN
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