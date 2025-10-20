-- Unhide match on re-match: update trigger function
CREATE OR REPLACE FUNCTION public.check_and_create_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  mutual_like_id uuid;
  v_user1 uuid;
  v_user2 uuid;
  v_match_id uuid;
BEGIN
  -- Check if the other user also liked this user
  SELECT id INTO mutual_like_id
  FROM public.likes
  WHERE from_user_id = NEW.to_user_id
  AND to_user_id = NEW.from_user_id;

  IF mutual_like_id IS NOT NULL THEN
    v_user1 := LEAST(NEW.from_user_id, NEW.to_user_id);
    v_user2 := GREATEST(NEW.from_user_id, NEW.to_user_id);

    -- Create a match (ensure user1_id < user2_id for uniqueness)
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    ON CONFLICT (user1_id, user2_id) DO NOTHING;

    -- Fetch match id (existing or newly created)
    SELECT id INTO v_match_id
    FROM public.matches
    WHERE user1_id = v_user1 AND user2_id = v_user2;

    -- Unhide this match for both users on the Matches page (and global 'both')
    DELETE FROM public.hidden_matches
    WHERE match_id = v_match_id
      AND hidden_from IN ('matches', 'both')
      AND user_id IN (v_user1, v_user2);

    -- Delete both likes since they've matched
    DELETE FROM public.likes WHERE id = mutual_like_id;
    DELETE FROM public.likes WHERE id = NEW.id;

    -- Return NULL to prevent inserting the like that triggered the match
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;