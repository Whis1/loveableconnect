-- 📢 Tabella per i banner pubblicitari gestiti dall'admin
--
-- Prima i banner erano hard-coded in src/data/banners.json e il BannerManager
-- salvava solo su localStorage (per-browser, invisibile agli altri utenti).
-- Aggiungendo/rimuovendo banner dall'admin non si propagava nulla.
-- Ora c'è una tabella DB: SELECT pubblica per la rotazione AdBanner, INSERT/DELETE
-- solo admin.

CREATE TABLE IF NOT EXISTS public.app_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_banners_position ON public.app_banners(position);

ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere (serve per la rotazione lato utente)
DROP POLICY IF EXISTS "Anyone can view banners" ON public.app_banners;
CREATE POLICY "Anyone can view banners"
  ON public.app_banners
  FOR SELECT
  USING (true);

-- Solo admin possono aggiungere
DROP POLICY IF EXISTS "Admin can insert banners" ON public.app_banners;
CREATE POLICY "Admin can insert banners"
  ON public.app_banners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admin possono rimuovere
DROP POLICY IF EXISTS "Admin can delete banners" ON public.app_banners;
CREATE POLICY "Admin can delete banners"
  ON public.app_banners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed: i 9 banner originalmente in src/data/banners.json. Inseriti solo se
-- la tabella e' vuota, cosi' rifare la migration non duplica nulla.
INSERT INTO public.app_banners (image_path, position)
SELECT * FROM (VALUES
  ('/images/banners/banner-1.gif', 1),
  ('/images/banners/banner-2.gif', 2),
  ('/images/banners/banner-3.gif', 3),
  ('/images/banners/banner-4.gif', 4),
  ('/images/banners/banner-5.gif', 5),
  ('/images/banners/banner-6.gif', 6),
  ('/images/banners/banner-7.gif', 7),
  ('/images/banners/banner-8.gif', 8),
  ('/images/banners/banner-9.gif', 9)
) AS seed(image_path, position)
WHERE NOT EXISTS (SELECT 1 FROM public.app_banners);
