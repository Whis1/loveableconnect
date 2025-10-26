-- Performance indexes to speed up profile browsing and chat actions
-- Likes lookup (from -> to)
CREATE INDEX IF NOT EXISTS idx_likes_from_to ON public.likes (from_user_id, to_user_id);

-- Matches lookup for both user orders
CREATE INDEX IF NOT EXISTS idx_matches_users ON public.matches (user1_id, user2_id);

-- Hidden matches lookup used after match check
CREATE INDEX IF NOT EXISTS idx_hidden_matches_lookup ON public.hidden_matches (match_id, user_id, hidden_from);

-- Profiles ordering/filtering
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles (last_active);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON public.profiles (age);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles (gender);
CREATE INDEX IF NOT EXISTS idx_profiles_orientation ON public.profiles (sexual_orientation);
