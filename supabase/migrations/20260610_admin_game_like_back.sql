-- 🎭 Like-back dei profili admin durante le partite: quando un utente mette
--    "Mi piace" a un profilo admin dalla card statistiche in partita, il
--    client (con probabilita' 50%) chiama questa funzione che fa ricambiare
--    il like all'admin. Protezioni: solo profili admin, solo se l'utente ha
--    messo like davvero, niente doppioni, niente like se gia' in match.

create or replace function public.admin_game_like_back(p_admin_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  -- Solo profili ADMIN possono ricambiare tramite questa funzione.
  if not exists (
    select 1 from profiles p
    where p.id = p_admin_id and p.is_admin_profile = true
  ) then
    return false;
  end if;

  -- Si ricambia solo un like reale dell'utente verso quell'admin.
  if not exists (
    select 1 from likes l
    where l.from_user_id = v_uid and l.to_user_id = p_admin_id
  ) then
    return false;
  end if;

  -- Niente doppioni.
  if exists (
    select 1 from likes l
    where l.from_user_id = p_admin_id and l.to_user_id = v_uid
  ) then
    return false;
  end if;

  -- Niente like se i due sono gia' in match.
  if exists (
    select 1 from matches m
    where (m.user1_id = v_uid and m.user2_id = p_admin_id)
       or (m.user2_id = v_uid and m.user1_id = p_admin_id)
  ) then
    return false;
  end if;

  insert into likes (from_user_id, to_user_id) values (p_admin_id, v_uid);
  return true;
end;
$$;
grant execute on function public.admin_game_like_back(uuid) to authenticated;
