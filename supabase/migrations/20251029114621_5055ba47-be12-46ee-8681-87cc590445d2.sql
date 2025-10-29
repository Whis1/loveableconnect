-- Update the handle_new_user trigger function to handle birthdate
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_birthdate DATE;
  v_age INTEGER;
BEGIN
  -- Get birthdate from metadata, if provided
  v_birthdate := (new.raw_user_meta_data->>'birthdate')::date;
  
  -- Calculate age from birthdate if provided, otherwise use age from metadata
  IF v_birthdate IS NOT NULL THEN
    v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_birthdate));
  ELSE
    v_age := COALESCE((new.raw_user_meta_data->>'age')::integer, NULL);
  END IF;

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
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'Utente'),
    COALESCE(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
    v_age,
    v_birthdate,
    COALESCE(new.raw_user_meta_data->>'city', NULL),
    COALESCE(new.raw_user_meta_data->>'gender', NULL),
    COALESCE(new.raw_user_meta_data->>'sexual_orientation', NULL),
    COALESCE(new.raw_user_meta_data->>'relationship_status', NULL),
    now(),
    now()
  );
  
  -- Create credits record for the new user with 26 credits
  INSERT INTO public.user_credits (
    user_id,
    balance,
    daily_likes_remaining,
    is_premium
  )
  VALUES (
    new.id,
    26,
    13,
    false
  );
  
  RETURN new;
END;
$$;