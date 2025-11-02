-- Create function to process notification queue
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_payload jsonb;
BEGIN
  -- Build notification payload
  notification_payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'body', NEW.body,
    'data', NEW.data,
    'notification_id', NEW.id
  );

  -- Call send-push-notification edge function via pg_net
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := notification_payload
  );

  RETURN NEW;
END;
$$;

-- Create trigger to auto-send notifications
DROP TRIGGER IF EXISTS on_notification_created ON notification_queue;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION process_notification_queue();