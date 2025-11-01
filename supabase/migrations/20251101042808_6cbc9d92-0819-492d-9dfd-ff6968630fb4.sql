-- Add 'voice' to message_type enum
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE messages
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'emoji', 'gif', 'voice'));