-- Aggiungi campo per bloccare la location dopo il primo inserimento
ALTER TABLE public.profiles
ADD COLUMN location_locked boolean DEFAULT false;

-- Aggiungi campo per il tipo di richiesta nei messaggi di supporto
ALTER TABLE public.support_messages
ADD COLUMN request_type text DEFAULT 'general';

-- Aggiungi campo per lo stato della richiesta
ALTER TABLE public.support_messages
ADD COLUMN request_status text DEFAULT 'pending';

-- Aggiungi campo per i dati della richiesta (es. nuova location)
ALTER TABLE public.support_messages
ADD COLUMN request_data jsonb;

-- Crea edge function per sbloccare temporaneamente la location
CREATE OR REPLACE FUNCTION public.unlock_location_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET location_locked = false
  WHERE id = p_user_id;
END;
$$;