-- Create table to manage archived conversations in admin chattors tab
CREATE TABLE IF NOT EXISTS public.admin_archived_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id UUID NOT NULL,
  user_id UUID NOT NULL,
  match_id UUID NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_user UNIQUE (admin_profile_id, user_id)
);

-- Enable RLS
ALTER TABLE public.admin_archived_conversations ENABLE ROW LEVEL SECURITY;

-- Policies: restrict to admins (when accessed from client). Edge functions use service role and bypass RLS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_archived_conversations' AND policyname = 'Admins can manage archived conversations'
  ) THEN
    CREATE POLICY "Admins can manage archived conversations"
    ON public.admin_archived_conversations
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_admin_archived_admin ON public.admin_archived_conversations (admin_profile_id);
CREATE INDEX IF NOT EXISTS idx_admin_archived_user ON public.admin_archived_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_archived_match ON public.admin_archived_conversations (match_id);
