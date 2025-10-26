-- Aggiorna il trigger per inserire tutti i dati della registrazione nel profilo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    nickname,
    age,
    city,
    gender,
    sexual_orientation,
    relationship_status,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'Utente'),
    COALESCE(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
    COALESCE((new.raw_user_meta_data->>'age')::integer, NULL),
    COALESCE(new.raw_user_meta_data->>'city', NULL),
    COALESCE(new.raw_user_meta_data->>'gender', NULL),
    COALESCE(new.raw_user_meta_data->>'sexual_orientation', NULL),
    COALESCE(new.raw_user_meta_data->>'relationship_status', NULL),
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
$function$;