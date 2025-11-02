-- Drop the function and all its dependencies
DROP FUNCTION IF EXISTS is_user_blocked(uuid, uuid) CASCADE;

-- Create the function with bidirectional blocking check
CREATE OR REPLACE FUNCTION is_user_blocked(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM blocked_users
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
       OR (blocker_id = user2_id AND blocked_id = user1_id)
  );
$$;

-- Recreate the policy
CREATE POLICY "Cannot message blocked users"
ON messages
FOR INSERT
WITH CHECK (
  (auth.uid() = sender_id) 
  AND (NOT is_user_blocked(sender_id, receiver_id)) 
  AND (EXISTS (
    SELECT 1
    FROM matches
    WHERE ((user1_id = sender_id AND user2_id = receiver_id) 
        OR (user2_id = sender_id AND user1_id = receiver_id))
  ))
);