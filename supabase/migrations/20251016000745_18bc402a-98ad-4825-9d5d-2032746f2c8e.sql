-- Rimuovere le policy precedenti
DROP POLICY IF EXISTS "Admins can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete profile images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update profile images" ON storage.objects;

-- Permettere a tutti gli utenti autenticati di caricare immagini nel bucket profile-images
CREATE POLICY "Anyone authenticated can upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- Permettere a tutti gli utenti autenticati di eliminare immagini dal bucket profile-images
CREATE POLICY "Anyone authenticated can delete profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

-- Permettere a tutti gli utenti autenticati di aggiornare immagini nel bucket profile-images
CREATE POLICY "Anyone authenticated can update profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');

-- Permettere lettura pubblica delle immagini (già esistente ma per sicurezza)
DROP POLICY IF EXISTS "Public access to profile images" ON storage.objects;
CREATE POLICY "Public access to profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');