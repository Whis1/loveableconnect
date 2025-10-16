
-- Rimuovi il ruolo admin dall'utente Gino
DELETE FROM user_roles 
WHERE user_id = 'e0428441-37f5-458d-935f-8ea2b1a349b9' 
AND role = 'admin';
