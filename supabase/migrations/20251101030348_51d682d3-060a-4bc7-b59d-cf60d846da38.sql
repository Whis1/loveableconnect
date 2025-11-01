-- Add manual_online_status field to profiles table for admin control
ALTER TABLE public.profiles 
ADD COLUMN manual_online_status boolean DEFAULT NULL;

COMMENT ON COLUMN public.profiles.manual_online_status IS 'Allows manual override of online status for admin profiles. NULL means auto-detect, true means force online, false means force offline';