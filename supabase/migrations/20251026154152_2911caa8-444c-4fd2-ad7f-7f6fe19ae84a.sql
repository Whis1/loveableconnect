-- Aggiungi il campo favorite_songs alla tabella profiles
ALTER TABLE public.profiles 
ADD COLUMN favorite_songs JSONB DEFAULT '[]'::jsonb;