-- Add column to store admin secondary account nickname
ALTER TABLE public.messages
ADD COLUMN admin_sender_nickname TEXT;