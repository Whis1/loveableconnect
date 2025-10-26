-- Funzione per resettare credits_depleted_at quando i crediti superano 26
CREATE OR REPLACE FUNCTION public.reset_credits_depleted_on_recharge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Se i crediti passano da sotto 26 a sopra/uguale a 26, resetta credits_depleted_at
  IF (OLD.balance < 26 AND NEW.balance >= 26) THEN
    NEW.credits_depleted_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger che si attiva quando il balance cambia
DROP TRIGGER IF EXISTS trigger_reset_credits_depleted ON public.user_credits;
CREATE TRIGGER trigger_reset_credits_depleted
  BEFORE UPDATE OF balance ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_credits_depleted_on_recharge();