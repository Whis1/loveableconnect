-- Permettere agli admin di caricare immagini nel bucket profile-images
CREATE POLICY "Admins can upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permettere agli admin di eliminare immagini dal bucket profile-images
CREATE POLICY "Admins can delete profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permettere agli admin di aggiornare immagini nel bucket profile-images
CREATE POLICY "Admins can update profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);