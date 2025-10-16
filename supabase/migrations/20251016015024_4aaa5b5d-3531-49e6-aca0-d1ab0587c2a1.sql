-- Drop all existing policies for chat-images bucket
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;

-- Allow authenticated users (including admins) to upload images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  (
    -- User uploading to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- OR user is an admin (can upload to any folder)
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow all authenticated users to view chat images
CREATE POLICY "Authenticated users can view chat images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-images');

-- Allow users to delete their own images or admins to delete any
CREATE POLICY "Users can delete chat images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);