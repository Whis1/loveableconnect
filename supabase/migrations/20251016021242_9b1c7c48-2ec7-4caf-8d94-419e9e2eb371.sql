
-- Crea tabella per i messaggi di supporto
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_admin_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Abilita RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti vedono i propri messaggi
CREATE POLICY "Users can view their own support messages"
ON public.support_messages
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Policy: Gli utenti possono creare messaggi
CREATE POLICY "Users can create support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Solo admin possono rispondere
CREATE POLICY "Admins can create responses"
ON public.support_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_admin_response = TRUE);

-- Policy: Gli utenti possono aggiornare i propri messaggi (marcarli come letti)
CREATE POLICY "Users can update their own messages"
ON public.support_messages
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Abilita realtime per questa tabella
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
