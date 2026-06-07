-- Temi estetici acquistati una-tantum (permanenti), es. {'darkcrow'}.
-- L'assegnazione avviene SOLO lato server (edge function verify-theme-payment,
-- service role) dopo il pagamento Stripe: niente self-grant dal client.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owned_themes text[] NOT NULL DEFAULT '{}';
