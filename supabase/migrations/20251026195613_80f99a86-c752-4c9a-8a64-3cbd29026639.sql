-- Rimuovi il vincolo di foreign key dalla tabella notification_queue
ALTER TABLE public.notification_queue
DROP CONSTRAINT IF EXISTS notification_queue_user_id_fkey;

-- Modifica il trigger notify_new_like per gestire errori nelle notifiche
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  liker_nickname TEXT;
  user_exists BOOLEAN;
BEGIN
  -- Verifica se l'utente destinatario esiste in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.to_user_id
  ) INTO user_exists;

  -- Se l'utente non esiste in auth.users, salta la creazione della notifica
  IF NOT user_exists THEN
    RETURN NEW;
  END IF;

  SELECT nickname INTO liker_nickname
  FROM public.profiles
  WHERE id = NEW.from_user_id;

  -- Prova a inserire la notifica, ma ignora errori
  BEGIN
    INSERT INTO public.notification_queue (user_id, type, title, body, data)
    VALUES (
      NEW.to_user_id,
      'like',
      '❤️ Nuovo Like',
      liker_nickname || ' ti ha messo like!',
      jsonb_build_object(
        'from_user_id', NEW.from_user_id,
        'url', '/likes'
      )
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- Ignora l'errore se la foreign key fallisce
      NULL;
    WHEN OTHERS THEN
      -- Ignora altri errori
      NULL;
  END;

  RETURN NEW;
END;
$$;