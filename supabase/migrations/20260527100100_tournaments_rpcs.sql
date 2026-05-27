-- 🏆 RPC TORNEO 8-PLAYER
-- ========================
-- Tutte SECURITY DEFINER perche' devono bypassare le RLS (insert/update
-- su tabelle a sola-SELECT-policy) ma con validazione manuale.

-- ============================================================
-- create_tournament: crea torneo + bracket completo.
-- Il CLIENT calcola gli ELO admin (computeAdminElos in adminElo.ts) e
-- predetermina i vincitori dei match NPC. Il backend valida e materializza.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tournament(
  _game_type TEXT,              -- 'othello' | 'dama'
  _admin_ids UUID[],            -- 7 id admin scelti dal client
  _admin_elos INTEGER[],        -- 7 ELO snapshot (stesso ordine di _admin_ids)
  _user_elo INTEGER,            -- ELO utente snapshot
  _predetermined_winners UUID[] -- 4 vincitori, uno per quarter di finale (pair 1..4)
  -- _predetermined_winners[i] = vincitore del quarter del pair i (i=1..4).
  -- Il pair che contiene l'utente ha un valore "fittizio" ignorato dalla RPC.
  -- Tutti gli id devono essere fra _admin_ids (cosi' anche il fittizio resta valido).
)
RETURNS TABLE (
  tournament_id UUID,
  user_slot INTEGER,
  match_durations_seconds INTEGER[]  -- array di 7 durate (in secondi) per i 7 match
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tournament_id UUID;
  v_user_slot INTEGER;
  v_existing UUID;
  v_admin_count INTEGER;
  v_match_durations INTEGER[];
  v_dur INTEGER;
  i INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _game_type NOT IN ('othello', 'dama') THEN
    RAISE EXCEPTION 'Invalid game_type: %', _game_type;
  END IF;

  IF array_length(_admin_ids, 1) <> 7
     OR array_length(_admin_elos, 1) <> 7
     OR array_length(_predetermined_winners, 1) <> 4 THEN
    RAISE EXCEPTION 'Expected 7 admin_ids, 7 admin_elos, 4 predetermined_winners';
  END IF;

  -- Cleanup tornei abbandonati prima di crearne uno nuovo (lazy cron).
  -- Tornei active con heartbeat scaduto >10 min → status='abandoned'.
  PERFORM public.cleanup_abandoned_tournaments_internal();

  -- Vieta torneo se ne ha gia' uno active (UNIQUE INDEX fallback ma diamo errore chiaro)
  SELECT id INTO v_existing FROM public.tournaments
    WHERE user_id = v_user_id AND status = 'active';
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'User already has an active tournament: %', v_existing;
  END IF;

  -- Verifica che i 7 admin_ids siano davvero admin distinti ed esistenti
  SELECT COUNT(DISTINCT id) INTO v_admin_count
    FROM public.profiles
    WHERE id = ANY(_admin_ids) AND is_admin_profile = TRUE;
  IF v_admin_count <> 7 THEN
    RAISE EXCEPTION 'Invalid admin selection: % admins valid out of 7', v_admin_count;
  END IF;

  -- L'utente non deve essere nei 7 admin (dovrebbe essere implicito ma controlliamo)
  IF v_user_id = ANY(_admin_ids) THEN
    RAISE EXCEPTION 'User cannot be in admin list';
  END IF;

  -- Verifica predetermined_winners: ciascuno DEVE essere uno degli admin
  FOR i IN 1..4 LOOP
    IF NOT (_predetermined_winners[i] = ANY(_admin_ids)) THEN
      RAISE EXCEPTION 'Predetermined winner #% is not in admin list: %', i, _predetermined_winners[i];
    END IF;
  END LOOP;

  -- 🎰 Scegli slot utente: random fra 1, 3, 5, 7 (cosi' gioca il primo match
  -- del proprio "pair"). Ai fini bracket, l'utente puo' essere in slot dispari
  -- (1, 3 lato sx; 5, 7 lato dx).
  v_user_slot := (ARRAY[1, 3, 5, 7])[1 + floor(random() * 4)::INTEGER];

  -- ===== CREATE TOURNAMENT =====
  INSERT INTO public.tournaments (
    user_id, game_type, status, current_round, user_slot, last_heartbeat_at
  ) VALUES (
    v_user_id, _game_type, 'active', 1, v_user_slot, NOW()
  ) RETURNING id INTO v_tournament_id;

  -- ===== CREATE PARTICIPANTS =====
  -- L'utente va in user_slot, i 7 admin negli altri 7 slot in ordine ricevuto.
  -- Distribuzione admin: il primo va nel "pair" dell'utente, gli altri 6 a riempire.
  INSERT INTO public.tournament_participants (
    tournament_id, profile_id, slot, bracket_side, is_user, elo_snapshot
  )
  SELECT
    v_tournament_id,
    CASE
      WHEN s.slot = v_user_slot THEN v_user_id
      ELSE _admin_ids[s.admin_idx]
    END,
    s.slot,
    CASE WHEN s.slot <= 4 THEN 'left' ELSE 'right' END,
    s.slot = v_user_slot,
    CASE
      WHEN s.slot = v_user_slot THEN _user_elo
      ELSE _admin_elos[s.admin_idx]
    END
  FROM (
    -- Genera (slot, admin_idx) skippando v_user_slot per gli admin
    SELECT
      slot,
      CASE
        WHEN slot < v_user_slot THEN slot
        WHEN slot > v_user_slot THEN slot - 1
        ELSE NULL
      END AS admin_idx
    FROM generate_series(1, 8) AS slot
  ) AS s;

  -- ===== CREATE QUARTI (4 match round=1) =====
  -- Match 1 (left, idx=1): slot 1 vs slot 2
  -- Match 2 (left, idx=2): slot 3 vs slot 4
  -- Match 3 (right, idx=1): slot 5 vs slot 6
  -- Match 4 (right, idx=2): slot 7 vs slot 8

  -- Durate match: per ogni NPC match → random 4..10 min (240..600 sec).
  -- Per il match utente → NULL (lo decide il client).
  v_match_durations := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL]::INTEGER[];

  FOR i IN 1..4 LOOP
    DECLARE
      v_pa_slot INTEGER := (i - 1) * 2 + 1; -- 1, 3, 5, 7
      v_pb_slot INTEGER := (i - 1) * 2 + 2; -- 2, 4, 6, 8
      v_pa_id UUID;
      v_pb_id UUID;
      v_side TEXT := CASE WHEN i <= 2 THEN 'left' ELSE 'right' END;
      v_is_user BOOLEAN;
      v_pre_winner UUID := NULL;
      v_npc_dur INTEGER;
    BEGIN
      SELECT profile_id INTO v_pa_id FROM public.tournament_participants
        WHERE tournament_id = v_tournament_id AND slot = v_pa_slot;
      SELECT profile_id INTO v_pb_id FROM public.tournament_participants
        WHERE tournament_id = v_tournament_id AND slot = v_pb_slot;

      v_is_user := (v_pa_id = v_user_id OR v_pb_id = v_user_id);

      IF NOT v_is_user THEN
        -- Mappa diretta: _predetermined_winners[i] (i=1..4) e' il vincitore del
        -- quarter del pair i. Il pair utente ha un valore fittizio ignorato.
        v_pre_winner := _predetermined_winners[i];

        -- Sanity: il predetermined winner deve essere uno dei due giocatori
        -- del match NPC. Se non lo e' (es. il client ha mandato l'id sbagliato),
        -- fallback: prendi il giocatore con ELO piu' alto.
        IF v_pre_winner <> v_pa_id AND v_pre_winner <> v_pb_id THEN
          DECLARE
            v_elo_a INTEGER;
            v_elo_b INTEGER;
          BEGIN
            SELECT elo_snapshot INTO v_elo_a FROM public.tournament_participants
              WHERE tournament_id = v_tournament_id AND profile_id = v_pa_id;
            SELECT elo_snapshot INTO v_elo_b FROM public.tournament_participants
              WHERE tournament_id = v_tournament_id AND profile_id = v_pb_id;
            v_pre_winner := CASE WHEN v_elo_a >= v_elo_b THEN v_pa_id ELSE v_pb_id END;
          END;
        END IF;

        v_npc_dur := 240 + floor(random() * 361)::INTEGER; -- 240..600s = 4..10 min
        v_match_durations[i] := v_npc_dur;

        INSERT INTO public.tournament_matches (
          tournament_id, round, bracket_side, match_index,
          player_a_id, player_b_id,
          predetermined_winner_id,
          is_user_match,
          status, started_at, scheduled_end_at
        ) VALUES (
          v_tournament_id, 1, v_side, ((i - 1) % 2) + 1,
          v_pa_id, v_pb_id,
          v_pre_winner,
          FALSE,
          'in_progress', NOW(), NOW() + (v_npc_dur || ' seconds')::INTERVAL
        );
      ELSE
        -- Match utente: NO scheduled_end_at, sta in 'waiting' finche' l'utente
        -- non clicca "Inizia partita". A quel punto status='in_progress' e
        -- la board fa il resto.
        INSERT INTO public.tournament_matches (
          tournament_id, round, bracket_side, match_index,
          player_a_id, player_b_id,
          predetermined_winner_id,
          is_user_match,
          status
        ) VALUES (
          v_tournament_id, 1, v_side, ((i - 1) % 2) + 1,
          v_pa_id, v_pb_id,
          NULL,
          TRUE,
          'waiting'
        );
      END IF;
    END;
  END LOOP;

  -- ===== CREATE SEMIFINALI (round=2, 2 match) e FINALE (round=3, 1 match) =====
  -- Status iniziale 'pending' (player_a_id/player_b_id NULL): si popolano
  -- via advance_tournament quando i match del round precedente sono completati.
  INSERT INTO public.tournament_matches (
    tournament_id, round, bracket_side, match_index,
    is_user_match, status
  ) VALUES
    (v_tournament_id, 2, 'left',  1, FALSE, 'pending'),
    (v_tournament_id, 2, 'right', 1, FALSE, 'pending'),
    (v_tournament_id, 3, 'final', 1, FALSE, 'pending');

  RETURN QUERY SELECT v_tournament_id, v_user_slot, v_match_durations;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tournament(TEXT, UUID[], INTEGER[], INTEGER, UUID[]) TO authenticated;

-- ============================================================
-- resolve_npc_match: chiamata dal client quando un match NPC ha
-- scheduled_end_at <= now(). Applica il predetermined_winner.
-- Idempotente (no-op se gia' completed).
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_npc_match(_match_id UUID)
RETURNS TABLE (
  match_id UUID,
  winner_id UUID,
  newly_resolved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.tournament_matches%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_tournament_user_id UUID;
BEGIN
  SELECT * INTO v_match FROM public.tournament_matches WHERE id = _match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', _match_id;
  END IF;

  -- Verifica che l'utente possieda il torneo
  SELECT user_id INTO v_tournament_user_id FROM public.tournaments WHERE id = v_match.tournament_id;
  IF v_tournament_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Idempotenza: se gia' completed, ritorna lo stato attuale
  IF v_match.status = 'completed' THEN
    RETURN QUERY SELECT v_match.id, v_match.winner_id, FALSE;
    RETURN;
  END IF;

  -- Solo NPC + in_progress + scheduled_end_at scaduto
  IF v_match.is_user_match THEN
    RAISE EXCEPTION 'Cannot auto-resolve a user match';
  END IF;
  IF v_match.status <> 'in_progress' OR v_match.scheduled_end_at IS NULL THEN
    RAISE EXCEPTION 'Match not in resolvable state (status=%, sched=%)',
      v_match.status, v_match.scheduled_end_at;
  END IF;
  IF NOW() < v_match.scheduled_end_at THEN
    RAISE EXCEPTION 'Match not yet ended (now=%, scheduled=%)',
      NOW(), v_match.scheduled_end_at;
  END IF;
  IF v_match.predetermined_winner_id IS NULL THEN
    RAISE EXCEPTION 'NPC match has no predetermined winner';
  END IF;

  -- Applica risultato
  UPDATE public.tournament_matches SET
    winner_id = v_match.predetermined_winner_id,
    loser_id = CASE
      WHEN v_match.predetermined_winner_id = v_match.player_a_id THEN v_match.player_b_id
      ELSE v_match.player_a_id
    END,
    status = 'completed',
    completed_at = NOW()
  WHERE id = _match_id;

  -- Segna il perdente come eliminato
  UPDATE public.tournament_participants SET
    eliminated_in_round = v_match.round
  WHERE tournament_id = v_match.tournament_id
    AND profile_id = CASE
      WHEN v_match.predetermined_winner_id = v_match.player_a_id THEN v_match.player_b_id
      ELSE v_match.player_a_id
    END;

  -- Trigger advance se tutti i match del round sono done
  PERFORM public.advance_tournament(v_match.tournament_id);

  RETURN QUERY SELECT v_match.id, v_match.predetermined_winner_id, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_npc_match(UUID) TO authenticated;

-- ============================================================
-- start_user_match: chiamato quando l'utente clicca "Inizia partita"
-- sul suo match. Cambia status da 'waiting' a 'in_progress'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_user_match(_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.tournament_matches%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_tournament_user_id UUID;
BEGIN
  SELECT * INTO v_match FROM public.tournament_matches WHERE id = _match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  SELECT user_id INTO v_tournament_user_id FROM public.tournaments WHERE id = v_match.tournament_id;
  IF v_tournament_user_id <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT v_match.is_user_match THEN RAISE EXCEPTION 'Not a user match'; END IF;
  IF v_match.status <> 'waiting' THEN
    -- Idempotenza: se gia' in_progress, ok
    IF v_match.status = 'in_progress' THEN RETURN; END IF;
    RAISE EXCEPTION 'Cannot start match in status: %', v_match.status;
  END IF;

  UPDATE public.tournament_matches SET
    status = 'in_progress',
    started_at = NOW()
  WHERE id = _match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_user_match(UUID) TO authenticated;

-- ============================================================
-- report_user_match_result: la board chiama questa quando l'utente
-- finisce il suo match (vittoria o sconfitta). Pareggio rigettato:
-- nei tornei serve sempre un vincitore (la board deve forzare la
-- decisione, ad es. "vince chi ha piu' pezzi" in caso di stallo).
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_user_match_result(
  _match_id UUID,
  _user_won BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.tournament_matches%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_tournament_user_id UUID;
  v_winner_id UUID;
  v_loser_id UUID;
BEGIN
  SELECT * INTO v_match FROM public.tournament_matches WHERE id = _match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  SELECT user_id INTO v_tournament_user_id FROM public.tournaments WHERE id = v_match.tournament_id;
  IF v_tournament_user_id <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT v_match.is_user_match THEN RAISE EXCEPTION 'Not a user match'; END IF;
  IF v_match.status = 'completed' THEN RETURN; END IF; -- idempotenza
  IF v_match.status NOT IN ('waiting', 'in_progress') THEN
    RAISE EXCEPTION 'Cannot report result in status: %', v_match.status;
  END IF;

  IF _user_won THEN
    v_winner_id := v_user_id;
    v_loser_id := CASE WHEN v_match.player_a_id = v_user_id THEN v_match.player_b_id ELSE v_match.player_a_id END;
  ELSE
    v_loser_id := v_user_id;
    v_winner_id := CASE WHEN v_match.player_a_id = v_user_id THEN v_match.player_b_id ELSE v_match.player_a_id END;
  END IF;

  UPDATE public.tournament_matches SET
    winner_id = v_winner_id,
    loser_id = v_loser_id,
    status = 'completed',
    completed_at = NOW()
  WHERE id = _match_id;

  UPDATE public.tournament_participants SET
    eliminated_in_round = v_match.round
  WHERE tournament_id = v_match.tournament_id
    AND profile_id = v_loser_id;

  PERFORM public.advance_tournament(v_match.tournament_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_user_match_result(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- advance_tournament: chiamata dopo ogni match completed.
-- - Se non tutti i match del round corrente sono completed → no-op
-- - Se sono tutti completed e ci sono piu' round → popola il prossimo round
--   (imposta player_a/b dai vincitori, scheduled_end_at per NPC matches,
--   status='in_progress' o 'waiting' per match utente)
-- - Se era la finale (round 3) → tournament.status='finished' + claim_rewards
-- ============================================================
CREATE OR REPLACE FUNCTION public.advance_tournament(_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_pending INTEGER;
  v_round INTEGER;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = _tournament_id;
  IF NOT FOUND OR v_tournament.status <> 'active' THEN RETURN; END IF;

  v_round := v_tournament.current_round;

  -- Quanti match del round attuale NON sono completed?
  SELECT COUNT(*) INTO v_pending FROM public.tournament_matches
    WHERE tournament_id = _tournament_id
      AND round = v_round
      AND status <> 'completed';
  IF v_pending > 0 THEN RETURN; END IF; -- non ancora pronto

  IF v_round = 3 THEN
    -- Finale completata
    DECLARE
      v_final_winner UUID;
      v_user_id UUID := v_tournament.user_id;
      v_user_final_pos INTEGER;
    BEGIN
      SELECT winner_id INTO v_final_winner FROM public.tournament_matches
        WHERE tournament_id = _tournament_id AND round = 3;

      -- Calcola posizione finale dell'utente
      SELECT CASE
        WHEN v_final_winner = v_user_id THEN 1                  -- vincitore
        WHEN EXISTS (SELECT 1 FROM public.tournament_matches WHERE tournament_id = _tournament_id AND round = 3 AND (player_a_id = v_user_id OR player_b_id = v_user_id)) THEN 2  -- finalista perdente
        WHEN EXISTS (SELECT 1 FROM public.tournament_matches WHERE tournament_id = _tournament_id AND round = 2 AND (player_a_id = v_user_id OR player_b_id = v_user_id)) THEN 3  -- semifinalista perdente (3 o 4, tie)
        ELSE 5  -- quartifinalista perdente (5..8)
      END INTO v_user_final_pos;

      UPDATE public.tournaments SET
        status = 'finished',
        current_round = 4,
        winner_id = v_final_winner,
        user_final_position = v_user_final_pos,
        finished_at = NOW()
      WHERE id = _tournament_id;

      -- Premi assegnati separatamente via claim_tournament_rewards (idempotente)
    END;
    RETURN;
  END IF;

  -- Popola il prossimo round (v_round+1)
  -- Round 2 (semi):
  --   left:  vincitore match(round=1, side=left, idx=1) vs vincitore match(round=1, side=left, idx=2)
  --   right: vincitore match(round=1, side=right, idx=1) vs vincitore match(round=1, side=right, idx=2)
  -- Round 3 (finale):
  --   vincitore match(round=2, side=left) vs vincitore match(round=2, side=right)
  IF v_round = 1 THEN
    -- Semi LEFT
    UPDATE public.tournament_matches SET
      player_a_id = (SELECT winner_id FROM public.tournament_matches
                     WHERE tournament_id = _tournament_id AND round = 1 AND bracket_side = 'left' AND match_index = 1),
      player_b_id = (SELECT winner_id FROM public.tournament_matches
                     WHERE tournament_id = _tournament_id AND round = 1 AND bracket_side = 'left' AND match_index = 2)
    WHERE tournament_id = _tournament_id AND round = 2 AND bracket_side = 'left';

    -- Semi RIGHT
    UPDATE public.tournament_matches SET
      player_a_id = (SELECT winner_id FROM public.tournament_matches
                     WHERE tournament_id = _tournament_id AND round = 1 AND bracket_side = 'right' AND match_index = 1),
      player_b_id = (SELECT winner_id FROM public.tournament_matches
                     WHERE tournament_id = _tournament_id AND round = 1 AND bracket_side = 'right' AND match_index = 2)
    WHERE tournament_id = _tournament_id AND round = 2 AND bracket_side = 'right';

  ELSIF v_round = 2 THEN
    UPDATE public.tournament_matches SET
      player_a_id = (SELECT winner_id FROM public.tournament_matches
                     WHERE tournament_id = _tournament_id AND round = 2 AND bracket_side = 'left'),
      player_b_id = (SELECT winner_id FROM public.tournament_matches
                     WHERE tournament_id = _tournament_id AND round = 2 AND bracket_side = 'right')
    WHERE tournament_id = _tournament_id AND round = 3;
  END IF;

  -- Avvia ogni match del nuovo round
  DECLARE
    rec RECORD;
    v_user_id UUID := v_tournament.user_id;
    v_is_user BOOLEAN;
    v_pre_winner UUID;
    v_npc_dur INTEGER;
  BEGIN
    FOR rec IN
      SELECT * FROM public.tournament_matches
        WHERE tournament_id = _tournament_id AND round = v_round + 1
    LOOP
      v_is_user := (rec.player_a_id = v_user_id OR rec.player_b_id = v_user_id);

      IF v_is_user THEN
        -- Match utente: status='waiting' (aspetta click "Inizia partita")
        UPDATE public.tournament_matches SET
          is_user_match = TRUE,
          status = 'waiting',
          predetermined_winner_id = NULL
        WHERE id = rec.id;
      ELSE
        -- Match NPC: serve un predetermined winner.
        -- Logica: usa il vincitore con piu' alto ELO snapshot (deterministico,
        -- semplice). Per tornei dove la difficolta' deve essere alta, gli admin
        -- top-ELO tendenzialmente passano. Variante: usa win_prob ELO-based ma
        -- gia' al create_tournament il client lo fa per round 1, qui semplifico.
        DECLARE
          v_elo_a INTEGER;
          v_elo_b INTEGER;
        BEGIN
          SELECT elo_snapshot INTO v_elo_a FROM public.tournament_participants
            WHERE tournament_id = _tournament_id AND profile_id = rec.player_a_id;
          SELECT elo_snapshot INTO v_elo_b FROM public.tournament_participants
            WHERE tournament_id = _tournament_id AND profile_id = rec.player_b_id;

          -- Probabilita' di vittoria ELO standard: Pa = 1 / (1 + 10^((Eb-Ea)/400))
          -- Coin flip pesato: se random() < Pa → vince A
          DECLARE
            v_pa_prob NUMERIC;
          BEGIN
            v_pa_prob := 1.0 / (1.0 + power(10, (v_elo_b - v_elo_a) / 400.0));
            IF random() < v_pa_prob THEN
              v_pre_winner := rec.player_a_id;
            ELSE
              v_pre_winner := rec.player_b_id;
            END IF;
          END;
        END;

        v_npc_dur := 240 + floor(random() * 361)::INTEGER;

        UPDATE public.tournament_matches SET
          is_user_match = FALSE,
          predetermined_winner_id = v_pre_winner,
          status = 'in_progress',
          started_at = NOW(),
          scheduled_end_at = NOW() + (v_npc_dur || ' seconds')::INTERVAL
        WHERE id = rec.id;
      END IF;
    END LOOP;
  END;

  UPDATE public.tournaments SET current_round = v_round + 1 WHERE id = _tournament_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_tournament(UUID) TO authenticated;

-- ============================================================
-- abandon_tournament: utente abbandona (volontariamente o per timeout).
-- Marca status='abandoned', applica sconfitta (-20 ELO) e finished_at.
-- Idempotente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.abandon_tournament(
  _tournament_id UUID,
  _reason TEXT DEFAULT 'voluntary'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = _tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tournament not found'; END IF;

  -- Solo l'utente owner puo' chiamare (timeout passa con user_id NULL ma
  -- in quel caso usiamo cleanup_abandoned_tournaments_internal).
  IF v_user_id IS NOT NULL AND v_tournament.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_tournament.status <> 'active' THEN RETURN; END IF;

  -- L'utente che abbandona viene trattato come se avesse PERSO il prossimo
  -- match che avrebbe dovuto giocare. La posizione finale dipende dal round
  -- corrente del torneo:
  --   round 1 (quarti)  → posizione 5 (5°-8°, premio 0 + -20 ELO)
  --   round 2 (semi)    → posizione 3 (3°-4°, premio 2 + -20 ELO)
  --   round 3 (finale)  → posizione 2 (premio 4 + -20 ELO)
  DECLARE
    v_final_pos INTEGER;
  BEGIN
    v_final_pos := CASE v_tournament.current_round
      WHEN 1 THEN 5
      WHEN 2 THEN 3
      WHEN 3 THEN 2
      ELSE 5
    END;

    UPDATE public.tournaments SET
      status = 'abandoned',
      finished_at = NOW(),
      user_final_position = v_final_pos
    WHERE id = _tournament_id;
  END;

  -- Premi e ELO penalty assegnati via claim_tournament_rewards (chiamato dal client).
  -- Il client puo' anche non chiamarlo se l'utente chiude tab: amen,
  -- gli ELO restano dove sono e non scattano premi. Non e' un bug:
  -- vogliamo proprio che il claim sia esplicito.
END;
$$;

GRANT EXECUTE ON FUNCTION public.abandon_tournament(UUID, TEXT) TO authenticated;

-- ============================================================
-- cleanup_abandoned_tournaments_internal: cleanup lazy chiamata da
-- create_tournament e tournament_heartbeat. Chiude i tornei active
-- con last_heartbeat_at piu' vecchio di 10 minuti.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_tournaments_internal()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tournaments SET
    status = 'abandoned',
    finished_at = NOW(),
    user_final_position = 5  -- trattato come 5°-8° per default
  WHERE status = 'active'
    AND last_heartbeat_at < NOW() - INTERVAL '10 minutes';
END;
$$;
-- Non concediamo EXECUTE pubblico, e' solo per uso interno.

-- ============================================================
-- tournament_heartbeat: il client la chiama ogni 30s mentre e' nel torneo.
-- Aggiorna last_heartbeat_at e fa cleanup di altri tornei abbandonati.
-- ============================================================
CREATE OR REPLACE FUNCTION public.tournament_heartbeat(_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;

  UPDATE public.tournaments SET
    last_heartbeat_at = NOW()
  WHERE id = _tournament_id
    AND user_id = v_user_id
    AND status = 'active';

  -- Cleanup opportunistico
  PERFORM public.cleanup_abandoned_tournaments_internal();
END;
$$;

GRANT EXECUTE ON FUNCTION public.tournament_heartbeat(UUID) TO authenticated;

-- ============================================================
-- claim_tournament_rewards: chiamata UNA volta quando il torneo e' finished
-- o abandoned. Assegna crediti + ELO secondo posizione finale.
-- Idempotente (rewards_claimed flag).
--
-- Premi:
--   1° (vincitore):       +12 crediti, +60 ELO (sul gioco specifico)
--   2° (finalista perso): +4 crediti, -20 ELO
--   3°-4° (semi persa):   +2 crediti, -20 ELO
--   5°-8° (quarti persa o abbandono): -20 ELO
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_tournament_rewards(_tournament_id UUID)
RETURNS TABLE (
  credits_awarded INTEGER,
  elo_delta INTEGER,
  final_position INTEGER,
  game_type TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_credits INTEGER := 0;
  v_elo INTEGER := 0;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = _tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.user_id <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_tournament.status = 'active' THEN
    RAISE EXCEPTION 'Tournament still active';
  END IF;
  IF v_tournament.rewards_claimed THEN
    -- Gia' claimed, ritorna 0 (idempotenza)
    RETURN QUERY SELECT 0, 0, v_tournament.user_final_position, v_tournament.game_type, v_tournament.status;
    RETURN;
  END IF;

  -- Determina premi
  CASE v_tournament.user_final_position
    WHEN 1 THEN v_credits := 12; v_elo := 60;
    WHEN 2 THEN v_credits := 4;  v_elo := -20;
    WHEN 3 THEN v_credits := 2;  v_elo := -20;
    WHEN 4 THEN v_credits := 2;  v_elo := -20;
    ELSE v_credits := 0; v_elo := -20; -- 5..8 (e abbandoni)
  END CASE;

  -- Accredita crediti (chiama deduct_credits con _amount negativo)
  IF v_credits > 0 THEN
    PERFORM public.deduct_credits(v_user_id, -v_credits);
  END IF;

  -- Aggiorna ELO unificato in profiles.game_elo via RPC esistente.
  -- (NB: nel sistema corrente l'ELO non è separato per gioco; usare la
  -- funzione standard mantiene la classifica coerente.)
  IF v_elo <> 0 THEN
    PERFORM public.update_game_elo(v_user_id, v_elo);
  END IF;

  -- Aggiorna stats win/loss del gioco specifico secondo posizione finale.
  -- Vincitore: +1 win, perdente in qualsiasi turno: +1 loss.
  IF v_tournament.user_final_position = 1 THEN
    PERFORM public.increment_game_stat(v_user_id, v_tournament.game_type, 'win');
  ELSE
    PERFORM public.increment_game_stat(v_user_id, v_tournament.game_type, 'lose');
  END IF;

  UPDATE public.tournaments SET rewards_claimed = TRUE WHERE id = _tournament_id;

  RETURN QUERY SELECT v_credits, v_elo, v_tournament.user_final_position, v_tournament.game_type, v_tournament.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_tournament_rewards(UUID) TO authenticated;
