-- Update notify_new_match to skip notifications when any participant is an admin profile
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user1_nickname TEXT;
  user2_nickname TEXT;
  is_user1_admin BOOLEAN;
  is_user2_admin BOOLEAN;
BEGIN
  -- Check admin flags
  SELECT is_admin_profile, nickname INTO is_user1_admin, user1_nickname
  FROM public.profiles
  WHERE id = NEW.user1_id;

  SELECT is_admin_profile, nickname INTO is_user2_admin, user2_nickname
  FROM public.profiles
  WHERE id = NEW.user2_id;

  -- If either participant is an admin profile, skip creating user notifications
  IF COALESCE(is_user1_admin, false) OR COALESCE(is_user2_admin, false) THEN
    RETURN NEW;
  END IF;

  -- Create notifications for both standard users
  INSERT INTO public.notification_queue (user_id, type, title, body, data)
  VALUES (
    NEW.user1_id,
    'match',
    '🎉 È un Match!',
    'Hai fatto match con ' || user2_nickname,
    jsonb_build_object(
      'match_id', NEW.id,
      'other_user_id', NEW.user2_id,
      'url', '/matches'
    )
  );

  INSERT INTO public.notification_queue (user_id, type, title, body, data)
  VALUES (
    NEW.user2_id,
    'match',
    '🎉 È un Match!',
    'Hai fatto match con ' || user1_nickname,
    jsonb_build_object(
      'match_id', NEW.id,
      'other_user_id', NEW.user1_id,
      'url', '/matches'
    )
  );

  RETURN NEW;
END;
$$;