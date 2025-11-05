-- Create RPC to fetch subscription types for a list of profile IDs (bypassing RLS safely)
CREATE OR REPLACE FUNCTION public.get_subscription_types(profile_ids uuid[])
RETURNS TABLE(user_id uuid, subscription_type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, subscription_type
  FROM public.user_credits
  WHERE user_id = ANY(profile_ids)
$$;