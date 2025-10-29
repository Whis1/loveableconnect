-- First, truncate existing nicknames that exceed 18 characters
UPDATE public.profiles
SET nickname = left(nickname, 18)
WHERE char_length(nickname) > 18;

-- Then add length constraint to nickname column (max 18 characters)
ALTER TABLE public.profiles
ADD CONSTRAINT nickname_max_length CHECK (char_length(nickname) <= 18);