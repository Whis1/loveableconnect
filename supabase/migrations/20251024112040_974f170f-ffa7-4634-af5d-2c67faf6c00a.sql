-- Fix security warnings: aggiungi search_path alle funzioni esistenti

-- Fix calculate_distance function
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  earth_radius DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN earth_radius * c;
END;
$$;

-- Fix check_and_reset_user_credits function
CREATE OR REPLACE FUNCTION public.check_and_reset_user_credits(_user_id uuid)
RETURNS TABLE(balance integer, is_premium boolean, last_daily_reset timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  current_premium BOOLEAN;
  depleted_at TIMESTAMP WITH TIME ZONE;
  last_reset TIMESTAMP WITH TIME ZONE;
BEGIN
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

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF current_balance < 40 AND depleted_at IS NOT NULL AND 
     NOW() - depleted_at >= INTERVAL '24 hours' THEN
    
    UPDATE public.user_credits
    SET 
      balance = 40,
      last_daily_reset = NOW(),
      credits_depleted_at = NULL
    WHERE user_id = _user_id;

    RETURN QUERY SELECT 40, current_premium, NOW();
  ELSE
    RETURN QUERY SELECT current_balance, current_premium, last_reset;
  END IF;
END;
$$;

-- Fix deduct_message_credits function
CREATE OR REPLACE FUNCTION public.deduct_message_credits(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  is_premium_user BOOLEAN;
  current_depleted_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT balance, is_premium, credits_depleted_at 
  INTO current_balance, is_premium_user, current_depleted_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF is_premium_user THEN
    RETURN TRUE;
  END IF;

  IF current_balance < 2 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_credits
  SET 
    balance = balance - 2,
    credits_depleted_at = CASE 
      WHEN balance - 2 < 40 AND current_depleted_at IS NULL 
      THEN NOW()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$$;

-- Fix reset_daily_credits function
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;