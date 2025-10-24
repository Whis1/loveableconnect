-- Funzione per creare automaticamente il profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    nickname,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Utente'),
    COALESCE(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
    now(),
    now()
  );
  
  -- Crea anche il record dei crediti per il nuovo utente
  INSERT INTO public.user_credits (
    user_id,
    balance,
    daily_likes_remaining,
    is_premium
  )
  VALUES (
    new.id,
    40,
    13,
    false
  );
  
  RETURN new;
END;
$$;

-- Elimina il trigger se esiste già
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crea il trigger che si attiva quando un nuovo utente si registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();