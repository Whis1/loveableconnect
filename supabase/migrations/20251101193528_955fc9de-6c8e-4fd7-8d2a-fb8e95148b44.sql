-- 1) Add match_id column to profile_notes
ALTER TABLE public.profile_notes
  ADD COLUMN IF NOT EXISTS match_id uuid;

-- 2) Add FK to matches table
ALTER TABLE public.profile_notes
  DROP CONSTRAINT IF EXISTS profile_notes_match_fk;

ALTER TABLE public.profile_notes
  ADD CONSTRAINT profile_notes_match_fk
  FOREIGN KEY (match_id)
  REFERENCES public.matches (id)
  ON DELETE CASCADE;

-- 3) Drop old unique constraint (profile_id, admin_profile_id)
ALTER TABLE public.profile_notes
  DROP CONSTRAINT IF EXISTS profile_notes_profile_id_admin_profile_id_key;

-- 4) Add new unique constraint per conversation
ALTER TABLE public.profile_notes
  DROP CONSTRAINT IF EXISTS profile_notes_unique_per_conversation;

ALTER TABLE public.profile_notes
  ADD CONSTRAINT profile_notes_unique_per_conversation
  UNIQUE (profile_id, admin_profile_id, match_id);

-- 5) Index for lookups by match
CREATE INDEX IF NOT EXISTS idx_profile_notes_match_id
  ON public.profile_notes (match_id);
