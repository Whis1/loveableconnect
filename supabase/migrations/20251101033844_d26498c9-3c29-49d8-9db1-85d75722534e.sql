-- Tabella per le segnalazioni tra utenti
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  match_id UUID,
  report_type TEXT NOT NULL CHECK (report_type IN ('violence', 'hate_speech', 'fake_profile', 'other')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_report_per_match UNIQUE (reporter_id, reported_id, match_id)
);

-- Tabella per i blocchi tra utenti
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies per user_reports
CREATE POLICY "Users can create reports"
ON public.user_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.user_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.user_reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies per blocked_users
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can unblock"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Admins can view all blocks"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Funzione per verificare se un utente è bloccato
CREATE OR REPLACE FUNCTION public.is_user_blocked(
  _user1_id UUID,
  _user2_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.blocked_users
    WHERE (blocker_id = _user1_id AND blocked_id = _user2_id)
       OR (blocker_id = _user2_id AND blocked_id = _user1_id)
  );
END;
$$;

-- Aggiorna la policy per i messaggi per impedire messaggi tra utenti bloccati
CREATE POLICY "Cannot message blocked users"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND NOT public.is_user_blocked(sender_id, receiver_id)
  AND EXISTS (
    SELECT 1
    FROM matches
    WHERE ((user1_id = sender_id AND user2_id = receiver_id) 
       OR (user2_id = sender_id AND user1_id = receiver_id))
  )
);