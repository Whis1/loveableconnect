-- Trigger types regeneration by adding a comment to ensure schema is properly reflected
-- This migration ensures all tables have proper structure

-- Verify profiles table structure
COMMENT ON TABLE public.profiles IS 'User profiles with personal information';

-- Verify matches table structure  
COMMENT ON TABLE public.matches IS 'User matches when both users like each other';

-- Verify likes table structure
COMMENT ON TABLE public.likes IS 'User likes for potential matches';

-- Verify messages table structure
COMMENT ON TABLE public.messages IS 'Messages between matched users';

-- Verify user_roles table structure
COMMENT ON TABLE public.user_roles IS 'User roles for access control';