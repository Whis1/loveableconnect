-- 📛 Admin display name + tracciamento admin che risponde ai support_messages
--
-- Cambiamenti:
-- 1) user_roles.display_name → nome leggibile dell'admin (es. "Marco")
--    Mostrato nei messaggi di risposta supporto al cliente
-- 2) support_messages.admin_id → quale admin ha scritto la risposta
--    Mostrato sotto il bubble del messaggio (solo agli altri admin)

-- 1. Aggiungi display_name a user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Aggiungi admin_id a support_messages
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Indice per join veloce admin_id → display_name
CREATE INDEX IF NOT EXISTS idx_support_messages_admin_id
  ON public.support_messages(admin_id)
  WHERE admin_id IS NOT NULL;
