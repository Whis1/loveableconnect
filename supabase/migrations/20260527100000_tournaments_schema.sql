-- 🏆 SCHEMA TORNEO 8-PLAYER (Othello / Dama)
-- ============================================
-- 3 tabelle:
--   tournaments              : 1 record per torneo (status, gioco, winner)
--   tournament_participants  : 8 record per torneo (1 utente + 7 admin)
--   tournament_matches       : 7 match per torneo (4 quarti + 2 semi + 1 finale)
--
-- 🎯 FLUSSO:
--   1) create_tournament: paga biglietto, crea torneo + 8 partecipanti +
--      7 match con scheduled_end_at futuro per gli NPC.
--   2) Polling client: i match NPC con now() >= scheduled_end_at vengono
--      risolti automaticamente (resolve_npc_match). Il vincitore era
--      predeterminato in fase di create.
--   3) Match utente: la board chiama report_user_match_result quando finisce.
--   4) advance_tournament: quando tutti i match del round sono completed,
--      crea i match del round successivo.
--   5) claim_tournament_rewards: a torneo finito, assegna premi (crediti +
--      ELO) e marca finished_at.
--   6) Heartbeat client (ogni 30s) tiene last_heartbeat_at fresco. Se passa
--      >10 min senza heartbeat e torneo ancora active → abandon_tournament
--      (utente eliminato + -20 ELO).
--
-- 🔒 RLS: l'utente vede solo i propri tornei. Gli admin vedono tutto.

-- ======================== TOURNAMENTS ========================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('othello', 'dama')),
  -- 'active' = in corso (utente sta giocando o aspetta NPC)
  -- 'finished' = finale conclusa, premi assegnati
  -- 'abandoned' = utente ha abbandonato o heartbeat scaduto
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
  -- Round corrente: 1 = quarti, 2 = semifinali, 3 = finale, 4 = concluso
  current_round INTEGER NOT NULL DEFAULT 1 CHECK (current_round BETWEEN 1 AND 4),
  -- Quale slot occupa l'utente nel bracket (1..8, vedi tournament_participants.slot)
  user_slot INTEGER NOT NULL CHECK (user_slot BETWEEN 1 AND 8),
  -- Posizione finale dell'utente (1=vincitore, 2=finale persa, 3-4=semi persa, 5-8=quarti persi)
  user_final_position INTEGER CHECK (user_final_position BETWEEN 1 AND 8),
  -- Profilo che ha vinto la finale (sia esso utente o admin)
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Premi già assegnati per evitare doppio claim
  rewards_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  -- Heartbeat anti-abbandono (10 min di tolleranza)
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un utente puo' avere SOLO UN torneo active alla volta (no duplicati)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tournaments_one_active_per_user
  ON public.tournaments (user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tournaments_user ON public.tournaments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_heartbeat ON public.tournaments(last_heartbeat_at)
  WHERE status = 'active';

-- ======================== PARTICIPANTS ========================
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Slot nel bracket (1..8). Layout:
  --   Lato sinistro:  slot 1 vs 2, slot 3 vs 4
  --   Lato destro:    slot 5 vs 6, slot 7 vs 8
  --   Semifinale sx:  vincitore(1-2) vs vincitore(3-4)
  --   Semifinale dx:  vincitore(5-6) vs vincitore(7-8)
  --   Finale:         vincitore semi sx vs vincitore semi dx
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 8),
  -- 'left' o 'right' (derivabile dallo slot ma comodo per query)
  bracket_side TEXT NOT NULL CHECK (bracket_side IN ('left', 'right')),
  is_user BOOLEAN NOT NULL DEFAULT FALSE,
  -- Snapshot dell'ELO al momento della creazione (per fairness e history)
  elo_snapshot INTEGER NOT NULL,
  -- Round in cui e' stato eliminato (NULL = ancora in corsa / vincitore)
  eliminated_in_round INTEGER CHECK (eliminated_in_round BETWEEN 1 AND 3),
  final_position INTEGER CHECK (final_position BETWEEN 1 AND 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, slot),
  UNIQUE(tournament_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament
  ON public.tournament_participants(tournament_id);

-- ======================== MATCHES ========================
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3), -- 1=quarti, 2=semi, 3=finale
  -- 'left' = lato sinistro del bracket; 'right' = lato destro;
  -- 'final' = la finale (round 3) attraversa entrambi i lati
  bracket_side TEXT NOT NULL CHECK (bracket_side IN ('left', 'right', 'final')),
  -- Posizione del match nel round (1..4 per i quarti, 1..2 per le semi, 1 per la finale)
  match_index INTEGER NOT NULL,
  -- Giocatori (NULL se il match deve ancora essere "popolato" perche'
  -- aspetta i vincitori del round precedente)
  player_a_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_b_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- TRUE solo se uno dei due e' l'utente (no NPC-vs-NPC)
  is_user_match BOOLEAN NOT NULL DEFAULT FALSE,
  -- Risultato predeterminato per i match NPC: chi vincera' a scheduled_end_at.
  -- NULL per i match utente (il risultato lo determina la board).
  predetermined_winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- 'pending'    = entrambi i giocatori ancora ignoti (aspetta round precedente)
  -- 'waiting'    = giocatori noti, aspetta avvio (match NPC pre-start, o match utente pre-pulsante)
  -- 'in_progress'= match NPC partito (scheduled_end_at impostato) o utente sta giocando
  -- 'completed'  = winner_id e loser_id impostati, ELO/stats applicate
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  -- Solo per match NPC: quando finira' automaticamente. resolve_npc_match
  -- al raggiungimento di questo timestamp fa lo "scatto" del risultato.
  scheduled_end_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament
  ON public.tournament_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_scheduled_end
  ON public.tournament_matches(scheduled_end_at)
  WHERE status = 'in_progress' AND scheduled_end_at IS NOT NULL;

-- ======================== TRIGGERS updated_at ========================
CREATE OR REPLACE FUNCTION public.tournaments_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trg_tournaments_updated_at BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.tournaments_set_updated_at();

DROP TRIGGER IF EXISTS trg_tournament_matches_updated_at ON public.tournament_matches;
CREATE TRIGGER trg_tournament_matches_updated_at BEFORE UPDATE ON public.tournament_matches
  FOR EACH ROW EXECUTE FUNCTION public.tournaments_set_updated_at();

-- ======================== RLS ========================
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Tournaments: l'utente vede solo i propri; admin (user_roles.role='admin') vede tutto
DROP POLICY IF EXISTS "user_owns_tournament_select" ON public.tournaments;
CREATE POLICY "user_owns_tournament_select" ON public.tournaments
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT/UPDATE/DELETE bloccati: tutto passa dalle RPC SECURITY DEFINER.
-- (No policy CREATE FOR INSERT/UPDATE → tutto rigettato. Bene.)

DROP POLICY IF EXISTS "user_owns_participant_select" ON public.tournament_participants;
CREATE POLICY "user_owns_participant_select" ON public.tournament_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "user_owns_match_select" ON public.tournament_matches;
CREATE POLICY "user_owns_match_select" ON public.tournament_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- ======================== REALTIME ========================
-- Aggiungi le 3 tabelle alla publication realtime per le live update del bracket
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
