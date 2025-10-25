-- Crea una funzione per detrarre un numero variabile di crediti
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
  is_premium_user BOOLEAN;
BEGIN
  SELECT balance, is_premium 
  INTO current_balance, is_premium_user
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Gli utenti premium non pagano
  IF is_premium_user THEN
    RETURN TRUE;
  END IF;

  -- Verifica che ci siano crediti sufficienti
  IF current_balance < _amount THEN
    RETURN FALSE;
  END IF;

  -- Deduce i crediti
  UPDATE public.user_credits
  SET balance = balance - _amount
  WHERE user_id = _user_id;

  RETURN TRUE;
END;
$function$;