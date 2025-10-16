-- Create enum for gallery access request status
CREATE TYPE public.gallery_access_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create table for gallery access requests
CREATE TABLE public.gallery_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status gallery_access_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.gallery_access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests and requests for their profiles
CREATE POLICY "Users can view requests they made or received"
ON public.gallery_access_requests
FOR SELECT
USING (
  auth.uid() = requester_id OR 
  auth.uid() = profile_id
);

-- Users can create requests
CREATE POLICY "Users can create access requests"
ON public.gallery_access_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Profile owners can update requests (accept/reject)
CREATE POLICY "Profile owners can update requests"
ON public.gallery_access_requests
FOR UPDATE
USING (auth.uid() = profile_id);

-- Trigger for updated_at
CREATE TRIGGER update_gallery_access_requests_updated_at
BEFORE UPDATE ON public.gallery_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();