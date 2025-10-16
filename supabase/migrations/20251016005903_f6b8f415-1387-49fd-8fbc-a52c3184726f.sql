-- Rimuovi il vecchio check constraint sui message_type
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Aggiungi il nuovo check constraint con tutti i tipi di messaggio
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'emoji', 'gif', 'gallery_access_request', 'gallery_access_response'));