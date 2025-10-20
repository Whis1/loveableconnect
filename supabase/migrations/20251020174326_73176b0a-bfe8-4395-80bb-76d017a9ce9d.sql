-- Fix ambiguous column reference in notify_admin_like and notify_admin_message
CREATE OR REPLACE FUNCTION public.notify_admin_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin_profile BOOLEAN;
BEGIN
  -- Controlla se il profilo che riceve il like è un profilo admin
  SELECT p.is_admin_profile INTO is_admin_profile
  FROM public.profiles p
  WHERE p.id = NEW.to_user_id;
  
  -- Se è un profilo admin, crea la notifica
  IF is_admin_profile THEN
    INSERT INTO public.admin_notifications (
      admin_profile_id,
      user_id,
      interaction_type
    ) VALUES (
      NEW.to_user_id,
      NEW.from_user_id,
      'like'
    );
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
  is_receiver_admin BOOLEAN;
  message_preview TEXT;
BEGIN
  -- Controlla se il destinatario è un profilo admin
  SELECT p.is_admin_profile INTO is_receiver_admin
  FROM public.profiles p
  WHERE p.id = NEW.receiver_id;
  
  -- Se è un profilo admin e il mittente non è admin, crea la notifica
  IF is_receiver_admin THEN
    -- Crea un'anteprima del messaggio (primi 50 caratteri)
    message_preview := LEFT(NEW.content, 50);
    IF LENGTH(NEW.content) > 50 THEN
      message_preview := message_preview || '...';
    END IF;
    
    INSERT INTO public.admin_notifications (
      admin_profile_id,
      user_id,
      interaction_type,
      message_preview
    ) VALUES (
      NEW.receiver_id,
      NEW.sender_id,
      'message',
      message_preview
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
