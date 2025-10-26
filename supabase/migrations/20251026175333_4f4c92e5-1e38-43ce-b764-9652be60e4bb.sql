-- Fix security warnings by setting search_path on notification functions

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_nickname TEXT;
BEGIN
  SELECT nickname INTO sender_nickname
  FROM public.profiles
  WHERE id = NEW.sender_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_new_like()
RETURNS TRIGGER AS $$
DECLARE
  liker_nickname TEXT;
BEGIN
  SELECT nickname INTO liker_nickname
  FROM public.profiles
  WHERE id = NEW.from_user_id;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
DECLARE
  user1_nickname TEXT;
  user2_nickname TEXT;
BEGIN
  SELECT nickname INTO user1_nickname
  FROM public.profiles
  WHERE id = NEW.user1_id;

  SELECT nickname INTO user2_nickname
  FROM public.profiles
  WHERE id = NEW.user2_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;