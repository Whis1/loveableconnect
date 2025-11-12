-- Unifica gli ELO di tutti i giochi in un unico campo
-- Mantieni il valore più alto tra tris_elo e risiko_elo come punto di partenza

-- Aggiungi il nuovo campo ELO unificato
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS game_elo INTEGER DEFAULT 1200;

-- Copia il valore più alto tra tris_elo e risiko_elo nel nuovo campo
UPDATE public.profiles
SET game_elo = GREATEST(
  COALESCE(tris_elo, 1200),
  COALESCE(risiko_elo, 1200)
);

-- Rimuovi i vecchi campi ELO separati
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS tris_elo,
DROP COLUMN IF EXISTS risiko_elo;

-- Aggiorna la funzione RPC per usare il nuovo campo unificato
CREATE OR REPLACE FUNCTION public.update_game_elo(user_id uuid, elo_change integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET game_elo = GREATEST(0, game_elo + elo_change)
  WHERE id = user_id;
END;
$$;