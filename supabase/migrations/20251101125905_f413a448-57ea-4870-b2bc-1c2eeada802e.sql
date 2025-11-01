-- Tabella per tracciare le partite giornaliere del Tris
CREATE TABLE IF NOT EXISTS public.tris_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  games_played_today INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indice per user_id
CREATE INDEX IF NOT EXISTS idx_tris_games_user_id ON public.tris_games(user_id);

-- Enable RLS
ALTER TABLE public.tris_games ENABLE ROW LEVEL SECURITY;

-- Policy per vedere i propri dati
CREATE POLICY "Users can view their own tris games"
  ON public.tris_games
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy per inserire i propri dati
CREATE POLICY "Users can insert their own tris games"
  ON public.tris_games
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy per aggiornare i propri dati
CREATE POLICY "Users can update their own tris games"
  ON public.tris_games
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function per resettare automaticamente le partite dopo 24h
CREATE OR REPLACE FUNCTION reset_tris_games_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.games_played_today := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per il reset automatico
CREATE TRIGGER trigger_reset_tris_games
  BEFORE UPDATE ON public.tris_games
  FOR EACH ROW
  EXECUTE FUNCTION reset_tris_games_if_needed();