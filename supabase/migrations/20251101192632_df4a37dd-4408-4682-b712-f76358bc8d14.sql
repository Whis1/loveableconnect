-- Aggiungi colonna admin_profile_id alla tabella profile_notes
ALTER TABLE public.profile_notes
ADD COLUMN admin_profile_id uuid REFERENCES public.profiles(id);

-- Rimuovi la vecchia constraint unique su profile_id
ALTER TABLE public.profile_notes
DROP CONSTRAINT IF EXISTS profile_notes_profile_id_key;

-- Aggiungi constraint unique sulla coppia (admin_profile_id, profile_id)
ALTER TABLE public.profile_notes
ADD CONSTRAINT profile_notes_admin_profile_unique UNIQUE (admin_profile_id, profile_id);