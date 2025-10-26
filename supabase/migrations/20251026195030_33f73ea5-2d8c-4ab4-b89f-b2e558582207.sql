-- Funzione per rimuovere il like quando si invia un messaggio
CREATE OR REPLACE FUNCTION public.remove_like_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Elimina il like del mittente verso il destinatario quando viene inviato un messaggio
  DELETE FROM public.likes
  WHERE from_user_id = NEW.sender_id
    AND to_user_id = NEW.receiver_id;
  
  RETURN NEW;
END;
$$;

-- Trigger che rimuove il like quando viene inviato un messaggio
CREATE TRIGGER remove_like_on_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.remove_like_on_message();