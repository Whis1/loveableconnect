-- Keep paid entitlements aligned with what the pricing cards promise.
-- This migration is safe to run in Lovable Cloud SQL.

CREATE OR REPLACE FUNCTION public.get_subscription_types(profile_ids uuid[])
RETURNS TABLE(user_id uuid, subscription_type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    uc.user_id,
    CASE
      WHEN uc.is_premium = true
        AND (uc.premium_expires_at IS NULL OR now() < uc.premium_expires_at)
      THEN COALESCE(uc.subscription_type, 'none')
      ELSE 'none'
    END AS subscription_type
  FROM public.user_credits uc
  WHERE uc.user_id = ANY(profile_ids)
$$;

CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance integer;
  is_premium_user boolean;
  premium_active boolean;
  sub_type text;
  tier text;
  expires_at timestamp with time zone;
BEGIN
  SELECT balance, is_premium, subscription_type, premium_tier, premium_expires_at
  INTO current_balance, is_premium_user, sub_type, tier, expires_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  premium_active := is_premium_user AND (expires_at IS NULL OR now() < expires_at);

  IF _amount <= 0 THEN
    UPDATE public.user_credits
    SET balance = balance - _amount,
        updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;

  -- Premium monthly has unlimited paid-credit actions.
  IF premium_active
    AND sub_type = 'monthly'
    AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN true;
  END IF;

  IF current_balance < _amount THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_message_credits(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance integer;
  is_premium_user boolean;
  premium_active boolean;
  current_depleted_at timestamp with time zone;
  sub_type text;
  tier text;
  expires_at timestamp with time zone;
BEGIN
  SELECT balance, is_premium, credits_depleted_at, subscription_type, premium_tier, premium_expires_at
  INTO current_balance, is_premium_user, current_depleted_at, sub_type, tier, expires_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  premium_active := is_premium_user AND (expires_at IS NULL OR now() < expires_at);

  -- Premium monthly has unlimited messages.
  IF premium_active
    AND sub_type = 'monthly'
    AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN true;
  END IF;

  IF current_balance < 2 THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET
    balance = balance - 2,
    updated_at = now(),
    credits_depleted_at = CASE
      WHEN (premium_active AND sub_type = 'monthly' AND tier = 'standard' AND balance - 2 < 70 AND current_depleted_at IS NULL) THEN now()
      WHEN (premium_active AND sub_type = 'weekly' AND balance - 2 < 40 AND current_depleted_at IS NULL) THEN now()
      WHEN ((NOT premium_active OR sub_type IS NULL OR sub_type = 'none' OR sub_type = '') AND balance - 2 < 16 AND current_depleted_at IS NULL) THEN now()
      ELSE credits_depleted_at
    END
  WHERE user_id = _user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_reset_daily_likes(_user_id uuid)
RETURNS TABLE(
  likes_remaining integer,
  reset_at timestamp with time zone,
  is_premium boolean,
  subscription_type text,
  premium_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_likes integer;
  current_reset_at timestamp with time zone;
  user_is_premium boolean;
  user_premium_active boolean;
  user_sub_type text;
  user_tier text;
  expires_at timestamp with time zone;
  daily_limit integer;
BEGIN
  SELECT
    daily_likes_remaining,
    daily_likes_reset_at,
    user_credits.is_premium,
    user_credits.subscription_type,
    user_credits.premium_tier,
    user_credits.premium_expires_at
  INTO current_likes, current_reset_at, user_is_premium, user_sub_type, user_tier, expires_at
  FROM public.user_credits
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  user_premium_active := user_is_premium AND (expires_at IS NULL OR now() < expires_at);

  IF user_premium_active THEN
    IF user_sub_type = 'monthly' AND user_tier = 'standard' THEN
      daily_limit := 40;
    ELSIF user_sub_type = 'weekly' THEN
      daily_limit := 30;
    ELSE
      daily_limit := 999999;
    END IF;
  ELSE
    daily_limit := 8;
  END IF;

  IF current_reset_at IS NULL OR now() >= current_reset_at THEN
    current_reset_at := now() + interval '24 hours';
    current_likes := daily_limit;
  ELSIF current_likes > daily_limit THEN
    current_likes := daily_limit;
  END IF;

  UPDATE public.user_credits
  SET daily_likes_remaining = current_likes,
      daily_likes_reset_at = current_reset_at,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN QUERY SELECT current_likes, current_reset_at, user_premium_active, user_sub_type, user_tier;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_daily_like(_user_id uuid, _use_credits boolean DEFAULT false)
RETURNS TABLE(success boolean, likes_remaining integer, credits_used boolean, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_likes integer;
  current_reset timestamp with time zone;
  premium_status boolean;
  premium_active boolean;
  sub_type text;
  tier text;
  expires_at timestamp with time zone;
  current_balance integer;
  max_likes integer;
BEGIN
  SELECT
    uc.daily_likes_remaining,
    uc.daily_likes_reset_at,
    uc.is_premium,
    uc.subscription_type,
    uc.premium_tier,
    uc.premium_expires_at,
    uc.balance
  INTO
    current_likes,
    current_reset,
    premium_status,
    sub_type,
    tier,
    expires_at,
    current_balance
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, false, 0;
    RETURN;
  END IF;

  premium_active := premium_status AND (expires_at IS NULL OR now() < expires_at);

  IF premium_active
    AND sub_type = 'monthly'
    AND (tier IS NULL OR tier = 'premium' OR tier = '') THEN
    RETURN QUERY SELECT true, 999999, false, current_balance;
    RETURN;
  END IF;

  IF premium_active AND sub_type = 'monthly' AND tier = 'standard' THEN
    max_likes := 40;
  ELSIF premium_active AND sub_type = 'weekly' THEN
    max_likes := 30;
  ELSE
    max_likes := 8;
  END IF;

  IF current_reset IS NULL OR now() >= current_reset THEN
    current_reset := now() + interval '24 hours';
    current_likes := max_likes;
  ELSIF current_likes > max_likes THEN
    current_likes := max_likes;
  END IF;

  IF current_likes > 0 THEN
    UPDATE public.user_credits
    SET daily_likes_remaining = current_likes - 1,
        daily_likes_reset_at = current_reset,
        updated_at = now()
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, current_likes - 1, false, current_balance;
    RETURN;
  END IF;

  IF _use_credits AND current_balance >= 2 THEN
    UPDATE public.user_credits
    SET balance = balance - 2,
        updated_at = now()
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, 0, true, current_balance - 2;
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET daily_likes_remaining = current_likes,
      daily_likes_reset_at = current_reset,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN QUERY SELECT false, 0, false, current_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_free_chat(_user_id uuid)
RETURNS TABLE(success boolean, chats_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_chats integer;
  current_reset timestamp with time zone;
  premium_status boolean;
  premium_active boolean;
  sub_type text;
  expires_at timestamp with time zone;
BEGIN
  SELECT
    uc.daily_free_chats_remaining,
    uc.daily_free_chats_reset_at,
    uc.is_premium,
    uc.subscription_type,
    uc.premium_expires_at
  INTO
    current_chats,
    current_reset,
    premium_status,
    sub_type,
    expires_at
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  premium_active := premium_status AND (expires_at IS NULL OR now() < expires_at);

  IF NOT premium_active OR sub_type != 'weekly' THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF current_reset IS NULL OR now() >= current_reset THEN
    current_chats := 5;
    current_reset := now() + interval '24 hours';
  END IF;

  IF current_chats > 0 THEN
    UPDATE public.user_credits
    SET daily_free_chats_remaining = current_chats - 1,
        daily_free_chats_reset_at = current_reset,
        updated_at = now()
    WHERE user_id = _user_id;

    RETURN QUERY SELECT true, current_chats - 1;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_reset_daily_free_chats(_user_id uuid)
RETURNS TABLE(chats_remaining integer, reset_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_chats integer;
  current_reset timestamp with time zone;
  premium_status boolean;
  premium_active boolean;
  sub_type text;
  expires_at timestamp with time zone;
BEGIN
  SELECT
    uc.daily_free_chats_remaining,
    uc.daily_free_chats_reset_at,
    uc.is_premium,
    uc.subscription_type,
    uc.premium_expires_at
  INTO current_chats, current_reset, premium_status, sub_type, expires_at
  FROM public.user_credits uc
  WHERE uc.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, NULL::timestamp with time zone;
    RETURN;
  END IF;

  premium_active := premium_status AND (expires_at IS NULL OR now() < expires_at);

  IF NOT premium_active OR sub_type != 'weekly' THEN
    RETURN QUERY SELECT 0, NULL::timestamp with time zone;
    RETURN;
  END IF;

  IF current_reset IS NULL OR now() >= current_reset THEN
    current_chats := 5;
    current_reset := now() + interval '24 hours';

    UPDATE public.user_credits
    SET daily_free_chats_remaining = current_chats,
        daily_free_chats_reset_at = current_reset,
        updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN QUERY SELECT current_chats, current_reset;
END;
$function$;
