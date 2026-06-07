-- Impedisce nickname duplicati tra TUTTI i profili, inclusi i profili admin.
-- La regola e' case-insensitive e ignora spazi iniziali/finali:
-- "Topazio", " topazio " e "TOPAZIO" sono considerati lo stesso nickname.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE nickname IS NOT NULL
      AND btrim(nickname) <> ''
    GROUP BY lower(btrim(nickname))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Esistono nickname duplicati in public.profiles: correggili prima di creare il vincolo di unicita.'
      USING HINT = 'Usa questa query per trovarli: SELECT lower(btrim(nickname)) AS nickname_normalizzato, count(*), array_agg(id || '' -> '' || nickname) FROM public.profiles WHERE nickname IS NOT NULL AND btrim(nickname) <> '''' GROUP BY lower(btrim(nickname)) HAVING count(*) > 1;';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_ci
  ON public.profiles (lower(btrim(nickname)))
  WHERE nickname IS NOT NULL
    AND btrim(nickname) <> '';
