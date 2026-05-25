-- 🚀 RPC admin_create_admin_user: bypassa COMPLETAMENTE supabase.auth.signUp.
--
-- Problema risolto: signUp ha rate limit (max 30 signup/h per IP, errori
-- "over_email_send_rate_limit"), password rules custom di gotrue, e
-- richiede email confirmation. Tutti questi limiti sono inevitabili da
-- client. L'admin di tier 1 vuole creare account staff con qualsiasi
-- password, qualsiasi email, senza limiti.
--
-- Soluzione: INSERT diretto in auth.users + auth.identities con pgcrypto
-- per la password (bcrypt = formato $2a$, compatibile con gotrue).
-- L'utente creato è immediatamente loggabile.

-- pgcrypto è già attivato di default in Supabase ma per sicurezza:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_tier INTEGER
)
RETURNS TABLE(success BOOLEAN, user_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := LOWER(TRIM(p_email));
BEGIN
  -- Verifica chiamante = admin tier 1
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Solo admin di tier 1 possono creare admin'::TEXT;
    RETURN;
  END IF;

  -- Valida input
  IF p_tier NOT IN (1, 2) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Tier deve essere 1 o 2'::TEXT;
    RETURN;
  END IF;
  IF v_email IS NULL OR v_email = '' OR POSITION('@' IN v_email) = 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Email non valida'::TEXT;
    RETURN;
  END IF;
  IF p_password IS NULL OR LENGTH(p_password) < 4 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Password troppo corta'::TEXT;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Email gia registrata'::TEXT;
    RETURN;
  END IF;

  -- INSERT diretto in auth.users con email già confermata e password bcrypt
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_anonymous,
    is_super_admin
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'full_name', 'Admin Tier ' || p_tier::TEXT,
      'is_admin_account', true
    ),
    false,
    false
  );

  -- INSERT in auth.identities (necessario per il login con email/password)
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Assegna ruolo admin con tier
  INSERT INTO public.user_roles (user_id, role, admin_tier)
  VALUES (v_user_id, 'admin', p_tier)
  ON CONFLICT (user_id, role) DO UPDATE SET admin_tier = p_tier;

  -- Cancella eventuale profile creato dal trigger handle_new_user
  -- (così l'admin NON appare in bacheca/esplorazione)
  DELETE FROM public.profiles WHERE id = v_user_id;

  RETURN QUERY SELECT true, v_user_id, ('Admin tier ' || p_tier::TEXT || ' creato: ' || v_email)::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, NULL::UUID, ('Errore: ' || SQLERRM)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_admin_user(TEXT, TEXT, INTEGER) TO authenticated;
