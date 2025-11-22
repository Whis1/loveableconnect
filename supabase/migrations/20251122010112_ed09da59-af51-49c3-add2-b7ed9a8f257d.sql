-- Trigger per cancellare gli sblocchi quando viene eliminato un match
CREATE OR REPLACE FUNCTION delete_unlock_on_match_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Cancella gli sblocchi per entrambi gli utenti del match eliminato
  DELETE FROM public.unlocked_like_profiles
  WHERE (user_id = OLD.user1_id AND unlocked_profile_id = OLD.user2_id)
     OR (user_id = OLD.user2_id AND unlocked_profile_id = OLD.user1_id);
  
  RETURN OLD;
END;
$$;

-- Crea il trigger
DROP TRIGGER IF EXISTS trigger_delete_unlock_on_match_delete ON public.matches;
CREATE TRIGGER trigger_delete_unlock_on_match_delete
  BEFORE DELETE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION delete_unlock_on_match_delete();