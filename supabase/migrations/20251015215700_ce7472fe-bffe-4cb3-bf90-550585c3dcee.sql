-- Create user_credits table to track daily free credits and purchases
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 40,
  last_daily_reset timestamp with time zone NOT NULL DEFAULT now(),
  is_premium boolean NOT NULL DEFAULT false,
  premium_expires_at timestamp with time zone,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('daily_grant', 'purchase', 'message_sent', 'like_reveal', 'refund')),
  reason text,
  order_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create purchases table for payment tracking
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type text NOT NULL CHECK (product_type IN ('credits_50', 'credits_75', 'credits_100', 'premium_monthly', 'like_reveal')),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  credits_amount integer,
  stripe_payment_intent_id text UNIQUE,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Create function to reset daily credits
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all non-premium users who haven't been reset in last 24 hours
  UPDATE public.user_credits
  SET 
    balance = GREATEST(balance, 40),
    last_daily_reset = now(),
    updated_at = now()
  WHERE 
    is_premium = false
    AND last_daily_reset < now() - interval '24 hours';
    
  -- Log the daily grant transactions
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reason)
  SELECT 
    user_id,
    CASE 
      WHEN balance < 40 THEN 40 - balance
      ELSE 0
    END,
    'daily_grant',
    'Daily free credits reset'
  FROM public.user_credits
  WHERE 
    is_premium = false
    AND last_daily_reset >= now() - interval '1 minute'
    AND balance <= 40;
END;
$$;

-- Create function to deduct credits for message
CREATE OR REPLACE FUNCTION public.deduct_message_credits(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  user_is_premium boolean;
BEGIN
  -- Get current balance and premium status
  SELECT balance, is_premium
  INTO current_balance, user_is_premium
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- Premium users have unlimited credits
  IF user_is_premium THEN
    -- Log transaction but don't deduct
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reason)
    VALUES (_user_id, 0, 'message_sent', 'Premium user - no deduction');
    RETURN true;
  END IF;
  
  -- Check if user has enough credits
  IF current_balance < 2 THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE public.user_credits
  SET 
    balance = balance - 2,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reason)
  VALUES (_user_id, -2, 'message_sent', 'Message sent');
  
  RETURN true;
END;
$$;

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits record"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_purchases_stripe_payment_intent ON public.purchases(stripe_payment_intent_id);

-- Enable realtime for user_credits
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;