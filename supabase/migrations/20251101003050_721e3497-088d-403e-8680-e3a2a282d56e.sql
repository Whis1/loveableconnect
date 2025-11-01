-- Fix RLS visibility issue for likes: combine view policies into a single PERMISSIVE OR policy
-- Ensure table has RLS enabled (no-op if already enabled)
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive SELECT policies that split sent/received and may AND together
DROP POLICY IF EXISTS "Users can view likes they received" ON public.likes;
DROP POLICY IF EXISTS "Users can view their own sent likes" ON public.likes;

-- Create a single PERMISSIVE policy allowing users to see likes they sent OR received
CREATE POLICY "Users can view own sent or received likes"
ON public.likes
AS PERMISSIVE
FOR SELECT
USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
