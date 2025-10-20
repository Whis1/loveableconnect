-- Create table to track hidden matches and conversations
CREATE TABLE public.hidden_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_id UUID NOT NULL,
  hidden_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- Enable RLS
ALTER TABLE public.hidden_matches ENABLE ROW LEVEL SECURITY;

-- Users can view their own hidden matches
CREATE POLICY "Users can view their own hidden matches"
ON public.hidden_matches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can hide their own matches
CREATE POLICY "Users can hide matches"
ON public.hidden_matches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unhide their own matches
CREATE POLICY "Users can unhide matches"
ON public.hidden_matches
FOR DELETE
USING (auth.uid() = user_id);