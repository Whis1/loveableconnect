-- Crea tabella per tracciare i profili like sbloccati individualmente
CREATE TABLE IF NOT EXISTS public.unlocked_like_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  unlocked_profile_id UUID NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  credits_used INTEGER DEFAULT 8,
  UNIQUE(user_id, unlocked_profile_id)
);

-- Enable RLS
ALTER TABLE public.unlocked_like_profiles ENABLE ROW LEVEL SECURITY;

-- Policy per vedere i propri profili sbloccati
CREATE POLICY "Users can view their own unlocked profiles"
  ON public.unlocked_like_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy per inserire i propri unlock
CREATE POLICY "Users can unlock profiles"
  ON public.unlocked_like_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Rimuovi la tabella likes_unlocked visto che non serve più
DROP TABLE IF EXISTS public.likes_unlocked CASCADE;