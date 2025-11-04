-- Add premium_tier column to user_credits to distinguish between different monthly plans
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS premium_tier text DEFAULT 'none' CHECK (premium_tier IN ('none', 'standard', 'premium'));

-- Update existing monthly subscribers to 'premium' tier
UPDATE public.user_credits 
SET premium_tier = 'premium' 
WHERE is_premium = true AND subscription_type = 'monthly';