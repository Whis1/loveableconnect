-- Aggiungi campo per bloccare la data di nascita
ALTER TABLE public.profiles
ADD COLUMN birthdate_locked boolean DEFAULT false;

-- Crea funzione per sbloccare la data di nascita
CREATE OR REPLACE FUNCTION public.unlock_birthdate_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET birthdate_locked = false
  WHERE id = p_user_id;
END;
$$;