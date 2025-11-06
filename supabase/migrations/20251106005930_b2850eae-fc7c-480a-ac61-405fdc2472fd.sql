-- Modifica il trigger notify_new_like per usare le email invece delle push notification
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  liker_nickname TEXT;
  user_exists BOOLEAN;
BEGIN
  -- Verifica se l'utente destinatario esiste in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.to_user_id
  ) INTO user_exists;

  -- Se l'utente non esiste in auth.users, salta la notifica
  IF NOT user_exists THEN
    RETURN NEW;
  END IF;

  SELECT nickname INTO liker_nickname
  FROM public.profiles
  WHERE id = NEW.from_user_id;

  -- Chiama l'edge function per inviare l'email
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
$$;

-- Modifica il trigger notify_new_message per usare le email invece delle push notification
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_nickname TEXT;
  is_receiver_admin BOOLEAN;
  message_preview TEXT;
BEGIN
  -- Check if receiver is an admin profile
  SELECT is_admin_profile INTO is_receiver_admin
  FROM public.profiles
  WHERE id = NEW.receiver_id;

  -- Skip notification if receiver is an admin profile
  IF COALESCE(is_receiver_admin, false) THEN
    RETURN NEW;
  END IF;

  -- Get sender nickname
  SELECT nickname INTO sender_nickname
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Create message preview
  message_preview := LEFT(NEW.content, 100);

  -- Chiama l'edge function per inviare l'email
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
$$;