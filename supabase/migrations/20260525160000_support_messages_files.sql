-- 📎 Support chat: aggiungi supporto a file generici (PDF, ZIP, DOC, ...).
-- Aggiunge le colonne file_url e file_name sulla tabella support_messages
-- e crea un bucket storage dedicato `support-files` con policy pubblica in
-- lettura e upload riservato agli utenti autenticati.

-- 1. Aggiungi le colonne
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 2. Bucket per i file generici (separato da `support-images` che era solo img)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-files', 'support-files', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy: gli utenti autenticati possono uploadare nel proprio folder
DROP POLICY IF EXISTS "Authenticated users can upload support files" ON storage.objects;
CREATE POLICY "Authenticated users can upload support files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-files');

-- 4. Policy: tutti (anche anon) possono leggere i file caricati (link condivisibili)
DROP POLICY IF EXISTS "Anyone can read support files" ON storage.objects;
CREATE POLICY "Anyone can read support files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-files');

-- 5. Policy: l'utente che ha caricato il file può eliminarlo (folder-based)
DROP POLICY IF EXISTS "Users can delete own support files" ON storage.objects;
CREATE POLICY "Users can delete own support files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'support-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
