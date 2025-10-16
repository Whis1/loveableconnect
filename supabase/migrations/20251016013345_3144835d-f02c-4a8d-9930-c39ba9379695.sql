-- Drop existing restrictive admin policies for messages
DROP POLICY IF EXISTS "Admins can send messages as admin profiles" ON public.messages;
DROP POLICY IF EXISTS "Admins can send messages as any user" ON public.messages;

-- Create a single permissive policy for admin message sending
CREATE POLICY "Admins have full insert permissions on messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);