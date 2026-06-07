BEGIN;

ALTER TABLE public.admin_notifications
ADD COLUMN IF NOT EXISTS source_table TEXT,
ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS admin_notifications_source_unique
ON public.admin_notifications (source_table, source_id)
WHERE source_table IS NOT NULL
  AND source_id IS NOT NULL;

DROP TRIGGER IF EXISTS on_like_to_admin ON public.likes;
DROP TRIGGER IF EXISTS notify_admin_on_like ON public.likes;
DROP TRIGGER IF EXISTS trg_likes_notify_admin ON public.likes;

DROP TRIGGER IF EXISTS on_message_to_admin ON public.messages;
DROP TRIGGER IF EXISTS notify_admin_on_message ON public.messages;
DROP TRIGGER IF EXISTS trg_messages_notify_admin ON public.messages;

CREATE OR REPLACE FUNCTION public.notify_admin_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  receiver_is_admin BOOLEAN;
BEGIN
  SELECT p.is_admin_profile INTO receiver_is_admin
  FROM public.profiles p
  WHERE p.id = NEW.to_user_id;

  IF COALESCE(receiver_is_admin, false) THEN
    INSERT INTO public.admin_notifications (
      admin_profile_id,
      user_id,
      interaction_type,
      source_table,
      source_id
    ) VALUES (
      NEW.to_user_id,
      NEW.from_user_id,
      'like',
      'likes',
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  receiver_is_admin BOOLEAN;
  sender_is_admin BOOLEAN;
  message_preview TEXT;
BEGIN
  SELECT p.is_admin_profile INTO receiver_is_admin
  FROM public.profiles p
  WHERE p.id = NEW.receiver_id;

  SELECT p.is_admin_profile INTO sender_is_admin
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

  IF COALESCE(receiver_is_admin, false) AND NOT COALESCE(sender_is_admin, false) THEN
    message_preview := LEFT(COALESCE(NEW.content, ''), 50);
    IF LENGTH(COALESCE(NEW.content, '')) > 50 THEN
      message_preview := message_preview || '...';
    END IF;

    INSERT INTO public.admin_notifications (
      admin_profile_id,
      user_id,
      interaction_type,
      message_preview,
      source_table,
      source_id
    ) VALUES (
      NEW.receiver_id,
      NEW.sender_id,
      'message',
      message_preview,
      'messages',
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_likes_notify_admin
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_like();

CREATE TRIGGER trg_messages_notify_admin
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_message();

WITH ordered AS (
  SELECT
    id,
    created_at,
    LAG(created_at) OVER (
      PARTITION BY admin_profile_id, user_id, interaction_type, COALESCE(message_preview, '')
      ORDER BY created_at ASC, id ASC
    ) AS previous_created_at
  FROM public.admin_notifications
),
duplicates AS (
  SELECT id
  FROM ordered
  WHERE previous_created_at IS NOT NULL
    AND created_at - previous_created_at <= INTERVAL '15 seconds'
)
DELETE FROM public.admin_notifications n
USING duplicates d
WHERE n.id = d.id;

COMMIT;
