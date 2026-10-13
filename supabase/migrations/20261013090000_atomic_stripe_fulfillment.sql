-- Only the server may fulfill Stripe orders. A receipt and its benefit updates
-- commit together, so webhook retries and success-page requests cannot double grant.
CREATE TABLE IF NOT EXISTS public.stripe_fulfillment_receipts (
  receipt_id text PRIMARY KEY,
  beneficiary_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_fulfillment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_fulfillment_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_fulfillment_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_stripe_checkout(_payment jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_session text := _payment->>'session_id';
  v_buyer uuid := (_payment->>'buyer_id')::uuid;
  v_user uuid := (_payment->>'beneficiary_id')::uuid;
  v_kind text := _payment->>'kind';
  v_credits integer := (_payment->>'credits')::integer;
  v_amount integer := (_payment->>'amount_cents')::integer;
  v_purchase public.purchases%ROWTYPE;
  v_order uuid;
  v_balance integer;
  v_gift boolean := COALESCE((_payment->>'is_gift')::boolean, false);
BEGIN
  IF v_session IS NULL OR v_session !~ '^cs_live_' OR
     (_payment->>'livemode')::boolean IS DISTINCT FROM true OR
     v_buyer IS NULL OR v_user IS NULL OR v_amount IS NULL OR v_amount <= 0 OR
     _payment->>'currency' IS DISTINCT FROM 'eur' OR
     v_kind IS NULL OR v_kind NOT IN ('credits','subscription','gift_credits','theme') THEN
    RAISE EXCEPTION 'Invalid live Stripe order';
  END IF;
  IF NOT v_gift AND v_user <> v_buyer THEN RAISE EXCEPTION 'Invalid beneficiary'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:' || v_session, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('stripe-user:' || v_user::text, 0));
  IF EXISTS (SELECT 1 FROM public.stripe_fulfillment_receipts WHERE receipt_id = 'checkout:' || v_session) THEN
    RETURN jsonb_build_object('success',true,'already_processed',true);
  END IF;

  SELECT * INTO v_purchase FROM public.purchases WHERE stripe_session_id = v_session FOR UPDATE;
  IF FOUND THEN
    IF v_purchase.user_id <> v_buyer THEN RAISE EXCEPTION 'Order owner mismatch'; END IF;
    IF v_purchase.status = 'completed' THEN
      INSERT INTO public.stripe_fulfillment_receipts VALUES ('checkout:' || v_session, v_user, v_kind, now());
      RETURN jsonb_build_object('success',true,'already_processed',true);
    END IF;
    IF v_purchase.status <> 'pending' THEN RAISE EXCEPTION 'Order cannot be fulfilled'; END IF;
    IF v_purchase.amount_cents <> v_amount OR v_purchase.currency <> _payment->>'currency' OR
       v_purchase.product_type <> _payment->>'product_type' OR
       (v_kind = 'credits' AND v_purchase.credits_amount <> v_credits) THEN
      RAISE EXCEPTION 'Paid order does not match pending purchase';
    END IF;
  END IF;

  IF v_kind = 'credits' THEN
    IF NOT ((v_credits = 50 AND v_amount = 999 AND _payment->>'product_type' = 'credits_50') OR
            (v_credits = 150 AND v_amount = 1999 AND _payment->>'product_type' = 'credits_130') OR
            (v_credits = 350 AND v_amount = 3999 AND _payment->>'product_type' = 'credits_220')) THEN
      RAISE EXCEPTION 'Invalid credit package';
    END IF;
    INSERT INTO public.user_credits(user_id,balance,daily_likes_remaining)
      VALUES (v_user,10,5) ON CONFLICT(user_id) DO NOTHING;
    UPDATE public.user_credits SET balance = balance + v_credits, updated_at = now()
      WHERE user_id = v_user RETURNING balance INTO v_balance;
  ELSIF v_kind = 'gift_credits' THEN
    IF NOT ((v_credits = 25 AND v_amount = 499) OR (v_credits = 100 AND v_amount = 1999)) THEN
      RAISE EXCEPTION 'Invalid gift credit package';
    END IF;
    IF EXISTS (SELECT 1 FROM public.gift_credit_purchases WHERE session_id = v_session AND user_id = v_user) THEN
      INSERT INTO public.stripe_fulfillment_receipts VALUES ('checkout:' || v_session, v_user, v_kind, now());
      RETURN jsonb_build_object('success',true,'already_processed',true);
    END IF;
    INSERT INTO public.user_credits(user_id,balance,daily_likes_remaining)
      VALUES (v_user,10,5) ON CONFLICT(user_id) DO NOTHING;
    UPDATE public.user_credits SET gift_credits = gift_credits + v_credits, updated_at = now()
      WHERE user_id = v_user RETURNING gift_credits INTO v_balance;
    INSERT INTO public.gift_credit_purchases(session_id,user_id,credits) VALUES(v_session,v_user,v_credits);
  ELSIF v_kind = 'theme' THEN
    IF _payment->>'theme' IS DISTINCT FROM 'darkcrow' OR v_amount <> 999 THEN RAISE EXCEPTION 'Invalid theme'; END IF;
    UPDATE public.profiles SET
      owned_themes = CASE WHEN 'darkcrow' = ANY(owned_themes) THEN owned_themes ELSE array_append(owned_themes,'darkcrow') END,
      profile_theme = CASE WHEN 'darkcrow' = ANY(owned_themes) THEN profile_theme ELSE 'darkcrow' END
      WHERE id = v_user;
    IF NOT FOUND THEN RAISE EXCEPTION 'Theme recipient not found'; END IF;
  ELSE
    IF _payment->>'subscription_id' IS NULL OR (_payment->>'expires_at')::timestamptz IS NULL OR
       (_payment->>'expires_at')::timestamptz <= now() OR
       _payment->>'subscription_type' NOT IN ('weekly','monthly') OR
       (_payment->>'subscription_type' = 'monthly' AND _payment->>'tier' NOT IN ('standard','premium')) THEN
      RAISE EXCEPTION 'Invalid subscription';
    END IF;
    IF v_gift AND NOT EXISTS (SELECT 1 FROM public.subscription_gifts WHERE stripe_session_id = v_session
      AND gifter_id = v_buyer AND recipient_id = v_user AND status = 'pending') THEN
      RAISE EXCEPTION 'Pending subscription gift not found';
    END IF;
    INSERT INTO public.user_credits(user_id,balance,daily_likes_remaining)
      VALUES(v_user,10,5) ON CONFLICT(user_id) DO NOTHING;
    UPDATE public.user_credits SET
      is_premium = true,
      premium_expires_at = (_payment->>'expires_at')::timestamptz,
      stripe_subscription_id = _payment->>'subscription_id',
      stripe_customer_id = CASE WHEN v_gift THEN stripe_customer_id ELSE COALESCE(_payment->>'customer_id',stripe_customer_id) END,
      subscription_type = _payment->>'subscription_type',
      premium_tier = CASE WHEN _payment->>'subscription_type' = 'weekly' THEN 'none' ELSE _payment->>'tier' END,
      balance = CASE WHEN _payment->>'subscription_type' = 'weekly' THEN 26 WHEN _payment->>'tier' = 'standard' THEN 40 ELSE 999999 END,
      daily_likes_remaining = CASE WHEN _payment->>'subscription_type' = 'weekly' THEN 10 WHEN _payment->>'tier' = 'standard' THEN 20 ELSE 999999 END,
      daily_free_chats_remaining = CASE WHEN _payment->>'subscription_type' = 'weekly' THEN 5 WHEN _payment->>'tier' = 'standard' THEN 0 ELSE 999999 END,
      has_used_weekly_trial = has_used_weekly_trial OR _payment->>'subscription_type' = 'weekly',
      daily_likes_reset_at = now() + interval '24 hours',
      daily_free_chats_reset_at = now() + interval '24 hours',
      last_daily_reset = now(), credits_depleted_at = NULL, updated_at = now()
      WHERE user_id = v_user RETURNING balance INTO v_balance;
    IF v_gift THEN
      UPDATE public.subscription_gifts SET status = 'completed', completed_at = now(),
        stripe_subscription_id = _payment->>'subscription_id' WHERE stripe_session_id = v_session;
    END IF;
  END IF;

  IF v_kind IN ('credits','subscription') THEN
    IF v_purchase.id IS NOT NULL THEN
      UPDATE public.purchases SET status = 'completed', completed_at = now(),
        stripe_payment_intent_id = _payment->>'payment_intent_id' WHERE id = v_purchase.id RETURNING id INTO v_order;
    ELSE
      INSERT INTO public.purchases(user_id,product_type,amount_cents,currency,credits_amount,
        stripe_session_id,stripe_payment_intent_id,status,completed_at)
      VALUES(v_buyer,_payment->>'product_type',v_amount,'eur',v_credits,v_session,
        _payment->>'payment_intent_id','completed',now()) RETURNING id INTO v_order;
    END IF;
    IF v_kind = 'credits' THEN
      INSERT INTO public.credit_transactions(user_id,amount,transaction_type,reason,order_id)
        VALUES(v_user,v_credits,'purchase','Purchased ' || v_credits || ' credits',v_order);
    END IF;
  END IF;
  INSERT INTO public.stripe_fulfillment_receipts VALUES('checkout:' || v_session,v_user,v_kind,now());
  RETURN jsonb_build_object('success',true,'already_processed',false,'balance',v_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_stripe_checkout(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_stripe_checkout(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.renew_stripe_subscription(_renewal jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id text := _renewal->>'invoice_id';
  v_user uuid := (_renewal->>'beneficiary_id')::uuid;
  v_expiry timestamptz := (_renewal->>'expires_at')::timestamptz;
  v_current public.user_credits%ROWTYPE;
BEGIN
  IF v_id IS NULL OR v_user IS NULL OR v_expiry IS NULL OR _renewal->>'subscription_id' IS NULL THEN
    RAISE EXCEPTION 'Invalid renewal';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('invoice:' || v_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('stripe-user:' || v_user::text,0));
  IF EXISTS(SELECT 1 FROM public.stripe_fulfillment_receipts WHERE receipt_id = 'invoice:' || v_id) THEN
    RETURN jsonb_build_object('success',true,'already_processed',true);
  END IF;
  SELECT * INTO v_current FROM public.user_credits WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription checkout has not been fulfilled yet'; END IF;
  -- An older invoice must not reset spent credits or revive a replaced subscription.
  IF v_current.stripe_subscription_id = _renewal->>'subscription_id' AND
     (v_current.premium_expires_at IS NULL OR v_expiry > v_current.premium_expires_at) THEN
    UPDATE public.user_credits SET is_premium = true, premium_expires_at = v_expiry,
      balance = CASE WHEN subscription_type = 'weekly' THEN 26 WHEN premium_tier = 'standard' THEN 40 ELSE 999999 END,
      daily_likes_remaining = CASE WHEN subscription_type = 'weekly' THEN 10 WHEN premium_tier = 'standard' THEN 20 ELSE 999999 END,
      daily_free_chats_remaining = CASE WHEN subscription_type = 'weekly' THEN 5 WHEN premium_tier = 'standard' THEN 0 ELSE 999999 END,
      daily_likes_reset_at = now() + interval '24 hours', daily_free_chats_reset_at = now() + interval '24 hours',
      last_daily_reset = now(), credits_depleted_at = NULL, updated_at = now() WHERE user_id = v_user;
  END IF;
  INSERT INTO public.stripe_fulfillment_receipts VALUES('invoice:' || v_id,v_user,'renewal',now());
  RETURN jsonb_build_object('success',true,'already_processed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.renew_stripe_subscription(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_stripe_subscription(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.end_stripe_subscription(_subscription_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.user_credits WHERE stripe_subscription_id = _subscription_id;
  IF v_user IS NULL THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('stripe-user:' || v_user::text,0));
  UPDATE public.user_credits SET is_premium = false, subscription_type = 'none', premium_tier = 'none',
    premium_expires_at = NULL, stripe_subscription_id = NULL, balance = 10, daily_likes_remaining = 5,
    daily_free_chats_remaining = 0, credits_depleted_at = NULL, updated_at = now()
    WHERE user_id = v_user AND stripe_subscription_id = _subscription_id;
  IF FOUND THEN UPDATE public.profiles SET profile_theme = 'none' WHERE id = v_user AND profile_theme = 'premium'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.end_stripe_subscription(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_stripe_subscription(text) TO service_role;
