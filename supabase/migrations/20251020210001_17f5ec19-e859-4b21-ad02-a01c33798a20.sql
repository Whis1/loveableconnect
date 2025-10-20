-- Add a column to track where the match is hidden from
ALTER TABLE public.hidden_matches
ADD COLUMN hidden_from text NOT NULL DEFAULT 'both' CHECK (hidden_from IN ('matches', 'messages', 'both'));

-- Update the unique constraint to allow hiding from different places
ALTER TABLE public.hidden_matches
DROP CONSTRAINT hidden_matches_user_id_match_id_key;

ALTER TABLE public.hidden_matches
ADD CONSTRAINT hidden_matches_user_id_match_id_hidden_from_key UNIQUE (user_id, match_id, hidden_from);