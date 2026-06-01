-- 🔔 Notifica Discord automatica a OGNI nuova registrazione utente.
--
-- Un trigger su public.profiles: quando nasce un nuovo profilo che NON è admin,
-- chiama la edge function notify-discord-support (type="signup") tramite pg_net.
-- Cattura il 100% delle registrazioni (email, Google, futuri metodi), perché il
-- profilo viene creato comunque dal trigger handle_new_user a valle dell'auth.
--
-- Richiede l'estensione pg_net (per le chiamate HTTP dal database).
-- Da eseguire nel SQL Editor di Lovable Cloud.

-- 1) Abilita pg_net (idempotente).
create extension if not exists pg_net with schema extensions;

-- 2) Funzione trigger: invia la notifica alla edge function.
create or replace function public.notify_discord_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text := 'https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/notify-discord-support';
  -- anon key del progetto: serve solo per passare il gateway delle edge function
  -- (la function non espone dati sensibili, manda solo a Discord).
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODIyNjcsImV4cCI6MjA3NTg1ODI2N30.emqOEktx6ELOiCP5KMPCK3cBmE5-voWBe8ybwkX3vzw';
  user_email text;
begin
  -- 🚫 Niente notifica per i profili ADMIN (i ~300 profili finti).
  if coalesce(new.is_admin_profile, false) = true then
    return new;
  end if;

  -- Recupera l'email reale dell'utente da auth.users (profiles non ce l'ha).
  select email into user_email from auth.users where id = new.id;

  -- Chiamata HTTP asincrona alla edge function (non blocca l'inserimento).
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'type', 'signup',
      'userEmail', coalesce(user_email, ''),
      'nickname', coalesce(new.nickname, new.full_name, '—')
    )
  );

  return new;
end;
$$;

-- 3) Il trigger: dopo ogni nuovo profilo.
drop trigger if exists trg_notify_discord_on_signup on public.profiles;
create trigger trg_notify_discord_on_signup
  after insert on public.profiles
  for each row
  execute function public.notify_discord_on_signup();
