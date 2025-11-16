-- Modifica la funzione per chiamare direttamente l'edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Ottieni l'email dell'utente da auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Chiama l'edge function per inviare l'email di benvenuto
  PERFORM net.http_post(
    url := 'https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI4MjI2NywiZXhwIjoyMDc1ODU4MjY3fQ.TrClYqM5LY0kR5FOfSqb6kjOdCnbqcZtMY3hcUEE7lo"}'::jsonb,
    body := jsonb_build_object(
      'userId', NEW.id,
      'email', user_email,
      'nickname', NEW.nickname
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';