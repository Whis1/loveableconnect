-- Force regeneration of TypeScript types
-- This migration ensures all tables have proper comments and indexes

COMMENT ON TABLE public.profiles IS 'User profiles with personal information';
COMMENT ON TABLE public.likes IS 'User likes for matching system';
COMMENT ON TABLE public.matches IS 'Matched users';
COMMENT ON TABLE public.messages IS 'Messages between matched users';
COMMENT ON TABLE public.user_roles IS 'User role assignments';

-- Ensure all tables have proper indexes
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON public.likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON public.likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON public.matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);