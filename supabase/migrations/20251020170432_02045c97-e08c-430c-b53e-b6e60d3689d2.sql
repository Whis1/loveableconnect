-- Fix check_and_reset_user_credits to properly handle premium expiration
CREATE OR REPLACE FUNCTION public.check_and_reset_user_credits(_user_id uuid)
 RETURNS TABLE(balance integer, last_daily_reset timestamp with time zone, is_premium boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  now_timestamp timestamp with time zone;
BEGIN
  now_timestamp := now();
  
  -- Get current user credits
  SELECT * INTO user_record
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- Check if premium has expired
  IF user_record.is_premium AND user_record.premium_expires_at IS NOT NULL 
     AND user_record.premium_expires_at < now_timestamp THEN
    -- Premium has expired, remove it
    UPDATE public.user_credits
    SET 
      is_premium = false,
      premium_expires_at = NULL,
      updated_at = now_timestamp
    WHERE user_id = _user_id;
    
    user_record.is_premium := false;
  END IF;
  
  -- If premium, just return current state (no daily reset needed)
  IF user_record.is_premium THEN
    RETURN QUERY
    SELECT user_record.balance, user_record.last_daily_reset, user_record.is_premium;
    RETURN;
  END IF;
  
  -- Check if 24 hours have passed for non-premium users
  IF user_record.last_daily_reset < now_timestamp - interval '24 hours' THEN
    -- Reset credits to 40
    UPDATE public.user_credits
    SET 
      balance = 40,
      last_daily_reset = now_timestamp,
      updated_at = now_timestamp
    WHERE user_id = _user_id;
    
    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reason)
    VALUES (_user_id, 40 - user_record.balance, 'daily_grant', 'Daily free credits reset');
    
    -- Return updated values
    RETURN QUERY
    SELECT 40::integer, now_timestamp, false;
  ELSE
    -- Return current values
    RETURN QUERY
    SELECT user_record.balance, user_record.last_daily_reset, user_record.is_premium;
  END IF;
END;
$function$;