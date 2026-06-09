-- 🎁 Regali in chat: saldo "crediti regalo" separato (si compra SOLO in euro),
--    invio regalo atomico (scala il saldo regalo del mittente, accredita
--    crediti normali al ricevente, inserisce il messaggio-regalo in chat).

-- 1) Saldo crediti regalo (separato dal balance normale: niente travasi
--    gratuiti, gli account finti non hanno nulla da farmare).
alter table public.user_credits
  add column if not exists gift_credits integer not null default 0;

-- 2) Registro idempotente degli acquisti Stripe (una session = un accredito).
create table if not exists public.gift_credit_purchases (
  session_id text primary key,
  user_id uuid not null,
  credits integer not null,
  created_at timestamptz not null default now()
);
alter table public.gift_credit_purchases enable row level security;
-- Nessuna policy: scrive/legge solo la service role (edge function).

-- 3) Invio regalo. Catalogo e costi DEVONO restare allineati a
--    src/lib/chatGifts.ts.
create or replace function public.send_chat_gift(
  p_match_id uuid,
  p_receiver uuid,
  p_gift_id text
)
returns table(success boolean, error text, new_gift_balance integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cost integer;
  v_balance integer;
begin
  -- Costo dal catalogo (fonte di verita' lato server).
  v_cost := case p_gift_id
    when 'rosa' then 2
    when 'bacio' then 3
    when 'colomba' then 4
    when 'cuore' then 6
    when 'frusta' then 8
    when 'champagne' then 10
    when 'diamante' then 20
    when 'corvo' then 50
    else null
  end;
  if v_cost is null then
    return query select false, 'UNKNOWN_GIFT', 0; return;
  end if;

  -- Il regalo si manda solo dentro un match reale tra i due utenti.
  if not exists (
    select 1 from matches m
    where m.id = p_match_id
      and ((m.user1_id = v_uid and m.user2_id = p_receiver)
        or (m.user2_id = v_uid and m.user1_id = p_receiver))
  ) then
    return query select false, 'NO_MATCH', 0; return;
  end if;

  -- Scala il saldo regalo SOLO se sufficiente (atomico).
  update user_credits
     set gift_credits = gift_credits - v_cost, updated_at = now()
   where user_id = v_uid and gift_credits >= v_cost
  returning gift_credits into v_balance;
  if not found then
    return query select false, 'INSUFFICIENT', coalesce((
      select gift_credits from user_credits where user_id = v_uid), 0);
    return;
  end if;

  -- Accredita crediti NORMALI al ricevente (gia' pagati in euro dal mittente).
  update user_credits
     set balance = balance + v_cost, updated_at = now()
   where user_id = p_receiver;
  if not found then
    insert into user_credits (user_id, balance, daily_likes_remaining)
    values (p_receiver, 10 + v_cost, 5);
  end if;

  -- Il regalo appare in chat come messaggio (realtime gia' attivo).
  insert into messages (match_id, sender_id, receiver_id, content, message_type)
  values (p_match_id, v_uid, p_receiver, '[gift:' || p_gift_id || ']', 'text');

  return query select true, null::text, v_balance;
end;
$$;
grant execute on function public.send_chat_gift(uuid, uuid, text) to authenticated;
