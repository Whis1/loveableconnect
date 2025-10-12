-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add message type and media_url to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url text;

-- Add check constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_message_type_check'
  ) THEN
    ALTER TABLE public.messages 
    ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'emoji', 'gif'));
  END IF;
END $$;

COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text, image, emoji, or gif';
COMMENT ON COLUMN public.messages.media_url IS 'URL for images or GIFs';

-- Create a table to track users who have paid to see likes
CREATE TABLE IF NOT EXISTS public.likes_unlocked (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_id text,
  unlocked_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  UNIQUE(user_id)
);

ALTER TABLE public.likes_unlocked ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own unlock status" ON public.likes_unlocked;
DROP POLICY IF EXISTS "Users can insert their own unlock" ON public.likes_unlocked;

-- RLS policies for likes_unlocked
CREATE POLICY "Users can view their own unlock status"
ON public.likes_unlocked
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlock"
ON public.likes_unlocked
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat images in their conversations" ON storage.objects;

-- Storage policies for chat images
CREATE POLICY "Users can upload chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat images in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.media_url LIKE '%' || storage.objects.name || '%'
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);