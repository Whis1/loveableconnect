-- Drop the current admin policy that's too restrictive
DROP POLICY IF EXISTS "Admins have full insert permissions on messages" ON public.messages;

-- Create a more permissive policy that allows admins to insert messages
-- from any sender_id without needing to check matches
CREATE POLICY "Admins can insert any message" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);