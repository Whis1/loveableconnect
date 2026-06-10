-- 🎁 Azioni admin nella chat di /admin/profiles (impersonando il profilo admin):
--    1) regali ILLIMITATI verso l'utente reale (nessun saldo scalato, l'utente
--       riceve i crediti del valore del regalo);
--    2) blocca/sblocca l'utente COME profilo admin (blocked_users).

-- 1) Regalo illimitato dal profilo admin.
create or replace function public.admin_send_chat_gift(
  p_match_id uuid,
  p_admin_id uuid,
  p_receiver uuid,
  p_gift_id text
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_cost integer;
begin
  -- Solo gli account admin del pannello possono usarla.
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Non autorizzato';
  end if;

  -- Il mittente deve essere un profilo ADMIN.
  if not exists (select 1 from profiles p where p.id = p_admin_id and p.is_admin_profile = true) then
    raise exception 'Mittente non valido';
  end if;

  v_cost := case p_gift_id
    when 'rosa' then 2
    when 'bacio' then 3
    when 'colomba' then 4
    when 'cuore' then 6
    when 'frusta' then 8
    when 'champagne' then 10
    when 'cane' then 12
    when 'schiavo' then 15
    when 'diamante' then 20
    when 'anello' then 50
    else null
  end;
  if v_cost is null then
    raise exception 'Regalo sconosciuto';
  end if;

  -- Il match deve esistere tra il profilo admin e l'utente.
  if not exists (
    select 1 from matches m
    where m.id = p_match_id
      and ((m.user1_id = p_admin_id and m.user2_id = p_receiver)
        or (m.user2_id = p_admin_id and m.user1_id = p_receiver))
  ) then
    raise exception 'Match non trovato';
  end if;

  -- Accredita i crediti all'utente reale (blocco protetto per sicurezza).
  begin
    update user_credits
       set balance = balance + v_cost, updated_at = now()
     where user_id = p_receiver;
    if not found then
      insert into user_credits (user_id, balance, daily_likes_remaining)
      values (p_receiver, 10 + v_cost, 5);
    end if;
  exception when others then
    null;
  end;

  -- Il regalo appare in chat (realtime gia' attivo).
  insert into messages (match_id, sender_id, receiver_id, content, message_type)
  values (p_match_id, p_admin_id, p_receiver, '[gift:' || p_gift_id || ']', 'text');

  return true;
end;
$$;
grant execute on function public.admin_send_chat_gift(uuid, uuid, uuid, text) to authenticated;

-- 2) Blocca/sblocca un utente come profilo admin.
--    p_action: 'get' (stato attuale), 'block', 'unblock'. Ritorna lo stato
--    di blocco risultante.
create or replace function public.admin_profile_block(
  p_admin_id uuid,
  p_user_id uuid,
  p_action text
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Non autorizzato';
  end if;
  if not exists (select 1 from profiles p where p.id = p_admin_id and p.is_admin_profile = true) then
    raise exception 'Profilo admin non valido';
  end if;

  if p_action = 'block' then
    insert into blocked_users (blocker_id, blocked_id)
    values (p_admin_id, p_user_id)
    on conflict do nothing;
    return true;
  elsif p_action = 'unblock' then
    delete from blocked_users
    where blocker_id = p_admin_id and blocked_id = p_user_id;
    return false;
  end if;

  return exists (
    select 1 from blocked_users
    where blocker_id = p_admin_id and blocked_id = p_user_id
  );
end;
$$;
grant execute on function public.admin_profile_block(uuid, uuid, text) to authenticated;
