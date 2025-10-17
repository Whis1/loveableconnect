-- Drop existing trigger first
DROP TRIGGER IF EXISTS create_match_on_mutual_like ON public.likes;
DROP TRIGGER IF EXISTS on_like_check_match ON public.likes;

-- Drop the function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.check_and_create_match() CASCADE;

-- Create updated function that creates match and deletes both likes
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  mutual_like_id uuid;
BEGIN
  -- Check if the other user also liked this user
  SELECT id INTO mutual_like_id
  FROM public.likes
  WHERE from_user_id = NEW.to_user_id
  AND to_user_id = NEW.from_user_id;

  IF mutual_like_id IS NOT NULL THEN
    -- Create a match (ensure user1_id < user2_id for uniqueness)
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.from_user_id, NEW.to_user_id),
      GREATEST(NEW.from_user_id, NEW.to_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
    
    -- Delete both likes since they've matched
    DELETE FROM public.likes WHERE id = mutual_like_id;
    DELETE FROM public.likes WHERE id = NEW.id;
    
    -- Return NULL to prevent inserting the like that triggered the match
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_like_check_match
  BEFORE INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();