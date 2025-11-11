-- Update the existing handle_new_user function to better handle OAuth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_birthdate DATE;
  v_age INTEGER;
  v_nickname TEXT;
  v_full_name TEXT;
BEGIN
  -- Extract birthdate
  v_birthdate := (new.raw_user_meta_data->>'birthdate')::date;
  
  -- Calculate age
  IF v_birthdate IS NOT NULL THEN
    v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_birthdate));
  ELSE
    v_age := COALESCE((new.raw_user_meta_data->>'age')::integer, NULL);
  END IF;

  -- Handle nickname: try multiple sources for OAuth users
  v_nickname := COALESCE(
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  -- Handle full name: try multiple sources for OAuth users
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'nickname',
    'Utente'
  );

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    full_name,
    nickname,
    age,
    birthdate,
    city,
    gender,
    sexual_orientation,
    relationship_status,
    tutorial_completed,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    v_full_name,
    v_nickname,
    v_age,
    v_birthdate,
    COALESCE(new.raw_user_meta_data->>'city', NULL),
    COALESCE(new.raw_user_meta_data->>'gender', NULL),
    COALESCE(new.raw_user_meta_data->>'sexual_orientation', NULL),
    COALESCE(new.raw_user_meta_data->>'relationship_status', NULL),
    false, -- New users start with tutorial not completed
    now(),
    now()
  );
  
  -- Create user credits record
  INSERT INTO public.user_credits (
    user_id,
    balance,
    daily_likes_remaining,
    is_premium,
    subscription_type,
    has_used_weekly_trial,
    daily_free_chats_remaining
  )
  VALUES (
    new.id,
    16,
    8,
    false,
    'none',
    false,
    0
  );
  
  RETURN new;
END;
$function$;