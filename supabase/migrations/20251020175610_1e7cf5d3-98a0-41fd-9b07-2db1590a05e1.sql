-- Crea tabella per le note dei profili
CREATE TABLE IF NOT EXISTS public.profile_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome text,
  eta text,
  location text,
  relazione text,
  figli text,
  hobby text,
  lavoro text,
  altro text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id)
);

-- Abilita RLS
ALTER TABLE public.profile_notes ENABLE ROW LEVEL SECURITY;

-- Policy per admin
CREATE POLICY "Admins can view all notes"
  ON public.profile_notes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notes"
  ON public.profile_notes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notes"
  ON public.profile_notes
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger per updated_at
CREATE TRIGGER update_profile_notes_updated_at
  BEFORE UPDATE ON public.profile_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
