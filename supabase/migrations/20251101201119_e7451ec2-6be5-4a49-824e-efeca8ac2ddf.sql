-- Remove old unique constraint that conflicts with match-based notes
ALTER TABLE public.profile_notes 
DROP CONSTRAINT IF EXISTS profile_notes_admin_profile_unique;