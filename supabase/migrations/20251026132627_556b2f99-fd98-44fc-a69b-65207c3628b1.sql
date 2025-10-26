-- Add image_url column to support_messages table
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for support images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-images', 'support-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for support images bucket
CREATE POLICY "Users can upload their own support images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'support-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own support images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'support-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all support images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'support-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Users can delete their own support images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'support-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);