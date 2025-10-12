-- Enable realtime for matches table
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- Recreate the trigger to ensure it works correctly
DROP TRIGGER IF EXISTS on_like_check_match ON public.likes;

CREATE TRIGGER on_like_check_match
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();