-- Remove old foreign key constraints that reference auth.users
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_from_user_id_fkey;
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_to_user_id_fkey;

-- Add new foreign key constraints that reference profiles table
ALTER TABLE public.likes 
  ADD CONSTRAINT likes_from_user_id_fkey 
  FOREIGN KEY (from_user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.likes 
  ADD CONSTRAINT likes_to_user_id_fkey 
  FOREIGN KEY (to_user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Do the same for matches table
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_user1_id_fkey;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_user2_id_fkey;

ALTER TABLE public.matches 
  ADD CONSTRAINT matches_user1_id_fkey 
  FOREIGN KEY (user1_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.matches 
  ADD CONSTRAINT matches_user2_id_fkey 
  FOREIGN KEY (user2_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- And for messages table
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE public.messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.messages 
  ADD CONSTRAINT messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;