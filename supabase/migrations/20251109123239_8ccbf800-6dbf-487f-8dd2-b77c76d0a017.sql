-- 1) TRIGGERS MANCANTI E AGGIORNAMENTI FUNZIONI

-- Likes: BEFORE INSERT per match immediato
DO $$ BEGIN
  CREATE TRIGGER trg_likes_check_match
  BEFORE INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.check_and_create_match();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Likes: AFTER INSERT per notifiche (utente e admin)
DO $$ BEGIN
  CREATE TRIGGER trg_likes_notify_new
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_like();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_likes_notify_admin
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_like();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Matches: AFTER INSERT per notification queue (già previsto nella funzione)
DO $$ BEGIN
  CREATE TRIGGER trg_matches_notify_new
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_match();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Messages: AFTER INSERT per notifiche email/admin e cleanup like
DO $$ BEGIN
  CREATE TRIGGER trg_messages_notify_new
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_messages_notify_admin
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_message();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_messages_remove_like
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.remove_like_on_message();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- notification_queue: AFTER INSERT per invio immediato via Edge Function
DO $$ BEGIN
  CREATE TRIGGER trg_notification_queue_process
  AFTER INSERT ON public.notification_queue
  FOR EACH ROW EXECUTE FUNCTION public.process_notification_queue();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_credits: BEFORE UPDATE per reset flag depleted quando si ricarica
DO $$ BEGIN
  CREATE TRIGGER trg_user_credits_reset_on_recharge
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.reset_credits_depleted_on_recharge();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2) ESTENSIONE FUNZIONI: inserimento in notification_queue per like e messaggi

-- Like: oltre all'email, inseriamo in notification_queue (skip se profilo admin)
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  liker_nickname TEXT;
  user_exists BOOLEAN;
  is_receiver_admin BOOLEAN;
BEGIN
  -- Verifica che il destinatario esista tra gli utenti
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.to_user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RETURN NEW;
  END IF;

  SELECT nickname INTO liker_nickname
  FROM public.profiles
  WHERE id = NEW.from_user_id;

  SELECT is_admin_profile INTO is_receiver_admin
  FROM public.profiles
  WHERE id = NEW.to_user_id;

  -- Push notification in coda (solo per utenti non admin)
  IF NOT COALESCE(is_receiver_admin, false) THEN
    INSERT INTO public.notification_queue (user_id, type, title, body, data)
    VALUES (
      NEW.to_user_id,
      'like',
      '❤️ Nuovo Like',
      'Hai ricevuto un like da ' || liker_nickname,
      jsonb_build_object('other_user_id', NEW.from_user_id, 'url', '/likes')
    );
  END IF;

  -- Email (come già esistente)
  PERFORM net.http_post(
    url := 'https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/send-like-notification-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI4MjI2NywiZXhwIjoyMDc1ODU4MjY3fQ.TrClYqM5LY0kR5FOfSqb6kjOdCnbqcZtMY3hcUEE7lo"}'::jsonb,
    body := jsonb_build_object(
      'userId', NEW.to_user_id,
      'likerNickname', liker_nickname
    )
  );

  RETURN NEW;
END;
$function$;

-- Messaggio: oltre all'email, inseriamo in notification_queue se utente non attivo di recente
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_nickname TEXT;
  is_receiver_admin BOOLEAN;
  message_preview TEXT;
  receiver_last_active TIMESTAMPTZ;
BEGIN
  -- Controlla se il destinatario è un profilo admin
  SELECT is_admin_profile INTO is_receiver_admin
  FROM public.profiles
  WHERE id = NEW.receiver_id;

  -- Nickname mittente
  SELECT nickname INTO sender_nickname
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Anteprima
  message_preview := LEFT(NEW.content, 100);

  -- Stato attività destinatario
  SELECT last_active INTO receiver_last_active
  FROM public.profiles
  WHERE id = NEW.receiver_id;

  -- Inserisci in coda push solo se non admin e non attivo negli ultimi 2 minuti
  IF NOT COALESCE(is_receiver_admin, false) THEN
    IF receiver_last_active IS NULL OR NOW() - receiver_last_active >= INTERVAL '2 minutes' THEN
      INSERT INTO public.notification_queue (user_id, type, title, body, data)
      VALUES (
        NEW.receiver_id,
        'message',
        '💬 Nuovo messaggio',
        'Hai ricevuto un messaggio da ' || sender_nickname,
        jsonb_build_object('match_id', NEW.match_id, 'sender_id', NEW.sender_id, 'url', '/chats')
      );
    END IF;
  END IF;

  -- Email (già presente)
  PERFORM net.http_post(
    url := 'https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/send-message-notification-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI4MjI2NywiZXhwIjoyMDc1ODU4MjY3fQ.TrClYqM5LY0kR5FOfSqb6kjOdCnbqcZtMY3hcUEE7lo"}'::jsonb,
    body := jsonb_build_object(
      'receiverId', NEW.receiver_id,
      'senderNickname', sender_nickname,
      'messagePreview', message_preview
    )
  );

  RETURN NEW;
END;
$function$;