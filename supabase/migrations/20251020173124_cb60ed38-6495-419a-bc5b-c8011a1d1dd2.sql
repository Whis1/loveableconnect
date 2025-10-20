-- Aggiungi foreign keys alla tabella admin_notifications
ALTER TABLE public.admin_notifications
ADD CONSTRAINT admin_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.admin_notifications
ADD CONSTRAINT admin_notifications_admin_profile_id_fkey 
FOREIGN KEY (admin_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;