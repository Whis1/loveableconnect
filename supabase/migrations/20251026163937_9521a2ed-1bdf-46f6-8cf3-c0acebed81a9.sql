-- Add new fields to profile_notes table
ALTER TABLE public.profile_notes
ADD COLUMN IF NOT EXISTS compleanno text,
ADD COLUMN IF NOT EXISTS fumatore text,
ADD COLUMN IF NOT EXISTS piercings text,
ADD COLUMN IF NOT EXISTS tatuaggi text,
ADD COLUMN IF NOT EXISTS colore_occhi text,
ADD COLUMN IF NOT EXISTS colore_capelli text,
ADD COLUMN IF NOT EXISTS peso_altezza text;