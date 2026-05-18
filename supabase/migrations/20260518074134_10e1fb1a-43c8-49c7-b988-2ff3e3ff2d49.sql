CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_session_id_key
  ON public.purchases (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;