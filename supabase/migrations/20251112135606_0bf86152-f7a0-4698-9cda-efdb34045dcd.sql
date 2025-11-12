-- Aggiungi campo badge alla tabella territory_connections
ALTER TABLE public.territory_connections
ADD COLUMN badge TEXT DEFAULT '🏔️';