-- Crea una funzione per inviare email di benvenuto quando un nuovo utente si registra
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  profile_nickname TEXT;
BEGIN
  -- Ottieni il nickname dal profilo appena creato
  SELECT nickname INTO profile_nickname
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- Inserisci nella coda di notifiche per far partire l'email
  INSERT INTO public.notification_queue (user_id, type, title, body, data)
  VALUES (
    NEW.id,
    'welcome',
    'Benvenuto su LoveableConnect!',
    'Il tuo account è stato creato con successo.',
    json_build_object('email', NEW.email, 'nickname', COALESCE(profile_nickname, 'Utente'))
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea il trigger per nuovi utenti (solo dopo creazione profilo)
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();