-- Create inbox_messages table for admin-to-user notifications
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own inbox messages
CREATE POLICY "Users can view their own inbox messages"
ON public.inbox_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own inbox messages
CREATE POLICY "Users can delete their own inbox messages"
ON public.inbox_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Users can update their own inbox messages (mark as read)
CREATE POLICY "Users can update their own inbox messages"
ON public.inbox_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can insert inbox messages for any user
CREATE POLICY "Admins can insert inbox messages"
ON public.inbox_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all inbox messages
CREATE POLICY "Admins can view all inbox messages"
ON public.inbox_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX idx_inbox_messages_user_id ON public.inbox_messages(user_id);
CREATE INDEX idx_inbox_messages_created_at ON public.inbox_messages(created_at DESC);

-- Enable realtime for inbox_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;