-- Update the reset_daily_credits function to always reset to 40 credits
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update all non-premium users who haven't been reset in last 24 hours
  UPDATE public.user_credits
  SET 
    balance = 40,
    last_daily_reset = now(),
    updated_at = now()
  WHERE 
    is_premium = false
    AND last_daily_reset < now() - interval '24 hours';
    
  -- Log the daily grant transactions
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reason)
  SELECT 
    user_id,
    40 - balance,
    'daily_grant',
    'Daily free credits reset'
  FROM public.user_credits
  WHERE 
    is_premium = false
    AND last_daily_reset >= now() - interval '1 minute'
    AND balance < 40;
END;
$function$;

-- Create a function to check and reset credits for a specific user
CREATE OR REPLACE FUNCTION public.check_and_reset_user_credits(_user_id uuid)
RETURNS TABLE(balance integer, last_daily_reset timestamp with time zone, is_premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  -- Get current user credits
  SELECT * INTO user_record
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- If premium, just return current state
  IF user_record.is_premium THEN
    RETURN QUERY
    SELECT user_record.balance, user_record.last_daily_reset, user_record.is_premium;
    RETURN;
  END IF;
  
  -- Check if 24 hours have passed
  IF user_record.last_daily_reset < now() - interval '24 hours' THEN
    -- Reset credits to 40
    UPDATE public.user_credits
    SET 
      balance = 40,
      last_daily_reset = now(),
      updated_at = now()
    WHERE user_id = _user_id;
    
    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reason)
    VALUES (_user_id, 40 - user_record.balance, 'daily_grant', 'Daily free credits reset');
    
    -- Return updated values
    RETURN QUERY
    SELECT 40, now(), false;
  ELSE
    -- Return current values
    RETURN QUERY
    SELECT user_record.balance, user_record.last_daily_reset, user_record.is_premium;
  END IF;
END;
$function$;