-- Crea tabella per tracciare le notifiche delle interazioni verso profili admin
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_profile_id UUID NOT NULL,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'message')),
  message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Abilita RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere tutte le notifiche
CREATE POLICY "Admins can view all notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy per permettere agli admin di aggiornare lo stato read
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indici per performance
CREATE INDEX idx_admin_notifications_profile ON public.admin_notifications(admin_profile_id);
CREATE INDEX idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_read ON public.admin_notifications(read);

-- Funzione per creare notifica quando un utente mette like a un profilo admin
CREATE OR REPLACE FUNCTION public.notify_admin_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_profile BOOLEAN;
BEGIN
  -- Controlla se il profilo che riceve il like è un profilo admin
  SELECT is_admin_profile INTO is_admin_profile
  FROM public.profiles
  WHERE id = NEW.to_user_id;
  
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
$$;

-- Trigger per likes verso profili admin
CREATE TRIGGER on_like_to_admin
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_like();

-- Funzione per creare notifica quando un utente invia un messaggio a un profilo admin
CREATE OR REPLACE FUNCTION public.notify_admin_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_receiver_admin BOOLEAN;
  message_preview TEXT;
BEGIN
  -- Controlla se il destinatario è un profilo admin
  SELECT is_admin_profile INTO is_receiver_admin
  FROM public.profiles
  WHERE id = NEW.receiver_id;
  
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
$$;

-- Trigger per messaggi verso profili admin
CREATE TRIGGER on_message_to_admin
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_message();