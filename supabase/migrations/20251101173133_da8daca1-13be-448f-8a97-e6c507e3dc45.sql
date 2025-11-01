-- Tabella per account admin secondari (separata da auth.users)
CREATE TABLE public.admin_secondary_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.admin_secondary_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: solo admin possono vedere gli account secondari
CREATE POLICY "Admins can view secondary accounts"
ON public.admin_secondary_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: solo admin possono creare account secondari
CREATE POLICY "Admins can create secondary accounts"
ON public.admin_secondary_accounts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: solo admin possono aggiornare account secondari
CREATE POLICY "Admins can update secondary accounts"
ON public.admin_secondary_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: solo admin possono eliminare account secondari
CREATE POLICY "Admins can delete secondary accounts"
ON public.admin_secondary_accounts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indice per ricerca veloce per nickname
CREATE INDEX idx_admin_secondary_accounts_nickname ON public.admin_secondary_accounts(nickname);