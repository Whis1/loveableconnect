-- Crea enum per i ruoli se non esiste già
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crea tabella user_roles se non esiste
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Abilita RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Funzione per verificare se un utente ha un ruolo specifico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: solo gli admin possono vedere i ruoli
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: solo gli admin possono gestire i ruoli
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Crea tabella per le configurazioni dei territori
CREATE TABLE IF NOT EXISTS public.territory_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    territory_index INTEGER NOT NULL,
    neighbor_indices INTEGER[] NOT NULL,
    territory_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE (territory_index)
);

-- Abilita RLS sulla tabella territory_connections
ALTER TABLE public.territory_connections ENABLE ROW LEVEL SECURITY;

-- Policy: tutti possono leggere le connessioni (necessario per il gioco)
CREATE POLICY "Anyone can read territory connections"
ON public.territory_connections
FOR SELECT
TO authenticated
USING (true);

-- Policy: solo admin possono modificare le connessioni
CREATE POLICY "Only admins can modify territory connections"
ON public.territory_connections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_territory_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_territory_connections_timestamp
BEFORE UPDATE ON public.territory_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_territory_connections_updated_at();

-- Inserisci le connessioni attuali (dai dati hardcoded)
INSERT INTO public.territory_connections (territory_index, neighbor_indices, territory_name) VALUES
-- Nord America (0-9)
(0, ARRAY[1, 4], 'Città Perduta'),
(1, ARRAY[0, 2, 5], 'Isola d''Elbagian'),
(2, ARRAY[1, 3, 5, 6], 'Porto Antico'),
(3, ARRAY[2, 7], 'Valle Oscura'),
(4, ARRAY[0, 5, 8], 'Montagne Gelate'),
(5, ARRAY[1, 2, 4, 6, 8, 9], 'Deserto Rosso'),
(6, ARRAY[2, 5, 7, 9], 'Foresta Nera'),
(7, ARRAY[3, 6], 'Laguna Azzurra'),
(8, ARRAY[4, 5, 9, 10], 'Castello Reale'),
(9, ARRAY[5, 6, 8, 10, 11], 'Piana Verde'),

-- Sud America (10-17)
(10, ARRAY[8, 11, 13], 'Vulcano Attivo'),
(11, ARRAY[9, 10, 12, 14], 'Penisola Sud'),
(12, ARRAY[11, 15], 'Arcipelago Nord'),
(13, ARRAY[10, 14, 16], 'Terra Sacra'),
(14, ARRAY[11, 13, 15, 16], 'Miniere d''Oro'),
(15, ARRAY[12, 14, 17], 'Roccaforte'),
(16, ARRAY[13, 14, 17], 'Baia Nebbiosa'),
(17, ARRAY[15, 16], 'Altopiano'),

-- Europa (18-26)
(18, ARRAY[19, 22], 'Giungla Fitta'),
(19, ARRAY[18, 20, 22, 23], 'Steppa Infinita'),
(20, ARRAY[19, 21, 23, 24], 'Oasi Nascosta'),
(21, ARRAY[20, 24, 25], 'Grotte Profonde'),
(22, ARRAY[18, 19, 23, 26], 'Pianura Fertile'),
(23, ARRAY[19, 20, 22, 24, 26], 'Costa Selvaggia'),
(24, ARRAY[20, 21, 23, 25, 26], 'Borgo Antico'),
(25, ARRAY[21, 24], 'Torre di Guardia'),
(26, ARRAY[22, 23, 24, 27], 'Fiume Lungo'),

-- Africa (27-35)
(27, ARRAY[26, 28, 30], 'Colline Verdi'),
(28, ARRAY[27, 29, 31], 'Mare Interno'),
(29, ARRAY[28, 32], 'Isola Vulcanica'),
(30, ARRAY[27, 31, 33], 'Terre Ghiacciate'),
(31, ARRAY[28, 30, 32, 34], 'Canyon Rosso'),
(32, ARRAY[29, 31, 33, 35], 'Savana Dorata'),
(33, ARRAY[30, 31, 34], 'Lago Cristallo'),
(34, ARRAY[31, 33, 35], 'Bosco Incantato'),
(35, ARRAY[32, 34], 'Delta Paludoso'),

-- Asia (36-47)
(36, ARRAY[37, 40], 'Montagna Sacra'),
(37, ARRAY[36, 38, 41], 'Villaggio Perduto'),
(38, ARRAY[37, 39, 42], 'Promontorio'),
(39, ARRAY[38, 43], 'Baia dei Pirati'),
(40, ARRAY[36, 41, 44], 'Fortezza'),
(41, ARRAY[37, 40, 42, 44, 45], 'Terre Desolate'),
(42, ARRAY[38, 41, 43, 45, 46], 'Zona Contaminata'),
(43, ARRAY[39, 42, 46, 47], 'Area Militare'),
(44, ARRAY[40, 41, 45, 48], 'Bunker Sotterraneo'),
(45, ARRAY[41, 42, 44, 46, 48, 49], 'Porto Abbandonato'),
(46, ARRAY[42, 43, 45, 47, 49], 'Città Fantasma'),
(47, ARRAY[43, 46, 50], 'Base Segreta'),

-- Oceania (48-53)
(48, ARRAY[44, 45, 49, 51], 'Laboratorio'),
(49, ARRAY[45, 46, 48, 50, 51, 52], 'Ospedale'),
(50, ARRAY[47, 49, 52, 53], 'Centro Commerciale'),
(51, ARRAY[48, 49, 52], 'Aeroporto'),
(52, ARRAY[49, 50, 51, 53], 'Stazione Ferroviaria'),
(53, ARRAY[50, 52], 'Centrale Elettrica')
ON CONFLICT (territory_index) DO NOTHING;