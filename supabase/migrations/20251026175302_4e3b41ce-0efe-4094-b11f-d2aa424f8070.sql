-- Create table for push notification subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Create table for notification queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'like', 'match')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_queue
CREATE POLICY "Service role can manage notifications"
  ON public.notification_queue
  FOR ALL
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_notification_queue_user_id ON public.notification_queue(user_id);
CREATE INDEX idx_notification_queue_sent ON public.notification_queue(sent);

-- Create function to trigger push notification on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_nickname TEXT;
BEGIN
  -- Get sender's nickname
  SELECT nickname INTO sender_nickname
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Queue notification for receiver
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to trigger push notification on new like
CREATE OR REPLACE FUNCTION notify_new_like()
RETURNS TRIGGER AS $$
DECLARE
  liker_nickname TEXT;
BEGIN
  -- Get liker's nickname
  SELECT nickname INTO liker_nickname
  FROM public.profiles
  WHERE id = NEW.from_user_id;

  -- Queue notification for liked user
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to trigger push notification on new match
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
DECLARE
  user1_nickname TEXT;
  user2_nickname TEXT;
BEGIN
  -- Get both users' nicknames
  SELECT nickname INTO user1_nickname
  FROM public.profiles
  WHERE id = NEW.user1_id;

  SELECT nickname INTO user2_nickname
  FROM public.profiles
  WHERE id = NEW.user2_id;

  -- Queue notification for user1
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

  -- Queue notification for user2
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

DROP TRIGGER IF EXISTS trigger_notify_new_like ON public.likes;
CREATE TRIGGER trigger_notify_new_like
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_like();

DROP TRIGGER IF EXISTS trigger_notify_new_match ON public.matches;
CREATE TRIGGER trigger_notify_new_match
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_match();