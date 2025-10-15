-- Rendi pubblico il bucket chat-images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-images';

-- Crea policy per permettere agli utenti autenticati di caricare immagini nelle proprie cartelle
CREATE POLICY "Users can upload their own chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Crea policy per permettere a tutti gli utenti autenticati di vedere le immagini della chat
CREATE POLICY "Authenticated users can view all chat images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-images');

-- Crea policy per permettere agli utenti di aggiornare le proprie immagini
CREATE POLICY "Users can update their own chat images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Crea policy per permettere agli utenti di eliminare le proprie immagini
CREATE POLICY "Users can delete their own chat images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);