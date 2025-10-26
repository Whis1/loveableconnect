-- Update notify_new_message to skip notifications when receiver is an admin profile
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_nickname TEXT;
  is_receiver_admin BOOLEAN;
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

  -- Create notification for standard user
  INSERT INTO public.notification_queue (user_id, type, title, body, data)
  VALUES (
    NEW.receiver_id,
    'message',
    '💬 Nuovo Messaggio',
    sender_nickname || ' ti ha scritto',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'message_id', NEW.id,
      'url', '/chat?user=' || NEW.sender_id
    )
  );

  RETURN NEW;
END;
$$;