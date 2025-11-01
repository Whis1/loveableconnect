-- Add tris_elo column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tris_elo integer DEFAULT 1200;

-- Create function to update ELO on win
CREATE OR REPLACE FUNCTION update_tris_elo(user_id uuid, elo_change integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET tris_elo = GREATEST(0, tris_elo + elo_change)
  WHERE id = user_id;
END;
$$;