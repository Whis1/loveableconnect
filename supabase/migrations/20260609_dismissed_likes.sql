-- 🙅 "Non mi interessa": il destinatario nasconde un like ricevuto dalla
--    propria lista, SENZA cancellare il like (che resta dell'altro utente).
--    Una riga per (utente, mittente del like) = like scartato da quell'utente.

create table if not exists public.dismissed_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, from_user_id)
);

create index if not exists dismissed_likes_user_idx on public.dismissed_likes(user_id);

alter table public.dismissed_likes enable row level security;

-- Ognuno gestisce solo i propri "scartati".
drop policy if exists dismissed_likes_select_own on public.dismissed_likes;
create policy dismissed_likes_select_own
  on public.dismissed_likes for select
  using (auth.uid() = user_id);

drop policy if exists dismissed_likes_insert_own on public.dismissed_likes;
create policy dismissed_likes_insert_own
  on public.dismissed_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists dismissed_likes_delete_own on public.dismissed_likes;
create policy dismissed_likes_delete_own
  on public.dismissed_likes for delete
  using (auth.uid() = user_id);
