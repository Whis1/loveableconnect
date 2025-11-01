-- Tabella per tracciare i regali di abbonamenti
CREATE TABLE IF NOT EXISTS public.subscription_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gifter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  subscription_type TEXT NOT NULL DEFAULT 'monthly',
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_subscription_gifts_gifter ON public.subscription_gifts(gifter_id);
CREATE INDEX IF NOT EXISTS idx_subscription_gifts_recipient ON public.subscription_gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_subscription_gifts_session ON public.subscription_gifts(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscription_gifts_status ON public.subscription_gifts(status);

-- RLS policies
ALTER TABLE public.subscription_gifts ENABLE ROW LEVEL SECURITY;

-- Chiunque autenticato può inserire un regalo
CREATE POLICY "Users can create subscription gifts"
  ON public.subscription_gifts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = gifter_id);

-- Puoi vedere i regali che hai fatto o ricevuto
CREATE POLICY "Users can view their gifts"
  ON public.subscription_gifts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = gifter_id OR auth.uid() = recipient_id);

-- Trigger per updated_at
CREATE TRIGGER update_subscription_gifts_updated_at
  BEFORE UPDATE ON public.subscription_gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();