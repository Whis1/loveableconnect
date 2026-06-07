BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at
ON public.profiles (last_login_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_profiles_last_logout_at
ON public.profiles (last_logout_at DESC NULLS LAST);

ALTER TABLE public.admin_notifications
DROP CONSTRAINT IF EXISTS admin_notifications_interaction_type_check;

ALTER TABLE public.admin_notifications
ADD CONSTRAINT admin_notifications_interaction_type_check
CHECK (interaction_type IN ('like', 'message', 'login', 'logout'));

CREATE OR REPLACE FUNCTION public.notify_admin_presence_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.is_admin_profile, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.last_login_at IS NOT NULL
    AND (OLD.last_login_at IS NULL OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at) THEN
    INSERT INTO public.admin_notifications (
      admin_profile_id,
      user_id,
      interaction_type,
      created_at
    ) VALUES (
      NEW.id,
      NEW.id,
      'login',
      COALESCE(NEW.last_login_at, now())
    );
  END IF;

  IF NEW.last_logout_at IS NOT NULL
    AND (OLD.last_logout_at IS NULL OR NEW.last_logout_at IS DISTINCT FROM OLD.last_logout_at) THEN
    INSERT INTO public.admin_notifications (
      admin_profile_id,
      user_id,
      interaction_type,
      created_at
    ) VALUES (
      NEW.id,
      NEW.id,
      'logout',
      COALESCE(NEW.last_logout_at, now())
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_notify_admin_presence ON public.profiles;

CREATE TRIGGER trg_profiles_notify_admin_presence
AFTER UPDATE OF last_login_at, last_logout_at ON public.profiles
FOR EACH ROW
WHEN (
  (OLD.last_login_at IS DISTINCT FROM NEW.last_login_at)
  OR (OLD.last_logout_at IS DISTINCT FROM NEW.last_logout_at)
)
EXECUTE FUNCTION public.notify_admin_presence_change();

COMMIT;
