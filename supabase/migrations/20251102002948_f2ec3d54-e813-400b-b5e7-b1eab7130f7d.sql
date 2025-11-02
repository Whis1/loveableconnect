-- Drop and recreate the function with hardcoded values
DROP FUNCTION IF EXISTS process_notification_queue() CASCADE;

CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call send-push-notification edge function via pg_net with hardcoded URL
  -- Using async http_post so it doesn't block the transaction
  PERFORM net.http_post(
    url := 'https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI4MjI2NywiZXhwIjoyMDc1ODU4MjY3fQ.TrClYqM5LY0kR5FOfSqb6kjOdCnbqcZtMY3hcUEE7lo"}'::jsonb,
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'data', NEW.data,
      'notification_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_notification_created ON notification_queue;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION process_notification_queue();