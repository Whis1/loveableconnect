
-- Crea trigger per notificare gli admin quando ricevono messaggi
CREATE TRIGGER notify_admin_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_message();

-- Crea trigger per notificare gli admin quando ricevono like
CREATE TRIGGER notify_admin_on_like
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_like();
