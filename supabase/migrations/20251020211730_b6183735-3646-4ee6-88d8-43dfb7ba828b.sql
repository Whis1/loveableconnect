-- Create trigger to automatically create matches when users like each other
CREATE TRIGGER on_like_created
  BEFORE INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();