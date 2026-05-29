import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeAdminElos } from "@/lib/adminElo";

// ============================================================
// 🏆 useTournament: state machine completa per un torneo 8-player.
//
// Espone:
//   - tournament, participants, matches: stato corrente (realtime sync)
//   - userMatch: il match attualmente "giocabile" dall'utente (round corrente,
//                is_user_match=true, status='waiting' o 'in_progress')
//   - createTournament(gameType): crea il torneo (paga il biglietto e fa
//                                  selezione admin lato client)
//   - startUserMatch(): l'utente clicca "Inizia partita"
//   - reportUserResult(userWon): la board chiama questa a fine partita
//   - abandonTournament(): utente esce volontariamente
//   - claimRewards(): assegna premi a torneo finished/abandoned
//
// Auto-features:
//   - polling resolve_npc_match ogni 1s sui match NPC scaduti
//   - heartbeat ogni 30s (anti-abbandono)
//   - realtime subscription su tournament_matches per refresh istantanei
//   - cleanup completo on unmount
// ============================================================

export type GameType = "othello" | "dama";

export interface TournamentRow {
  id: string;
  user_id: string;
  game_type: GameType;
  status: "active" | "finished" | "abandoned";
  current_round: number;
  user_slot: number;
  user_final_position: number | null;
  winner_id: string | null;
  rewards_claimed: boolean;
  last_heartbeat_at: string;
  started_at: string;
  finished_at: string | null;
}

export interface ParticipantRow {
  id: string;
  tournament_id: string;
  profile_id: string;
  slot: number;
  bracket_side: "left" | "right";
  is_user: boolean;
  elo_snapshot: number;
  eliminated_in_round: number | null;
  // 🔗 Profilo arricchito (join via fetchProfiles)
  profile?: {
    id: string;
    nickname: string | null;
    full_name: string;
    avatar_url: string | null;
    photos: string[] | null;
    is_admin_profile: boolean | null;
  };
}

export interface MatchRow {
  id: string;
  tournament_id: string;
  round: 1 | 2 | 3;
  bracket_side: "left" | "right" | "final";
  match_index: number;
  player_a_id: string | null;
  player_b_id: string | null;
  winner_id: string | null;
  loser_id: string | null;
  is_user_match: boolean;
  predetermined_winner_id: string | null;
  status: "pending" | "waiting" | "in_progress" | "completed";
  started_at: string | null;
  scheduled_end_at: string | null;
  completed_at: string | null;
}

interface AdminProfile {
  id: string;
  nickname: string | null;
  full_name: string;
  avatar_url: string | null;
  photos: string[] | null;
  is_admin_profile: boolean | null;
  game_elo: number | null;
}

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const NPC_POLL_INTERVAL_MS = 1000;

export function useTournament(currentUserId: string | null) {
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const npcPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // 🛡️ Id del torneo "di sessione". Tutti i fetch per un id DIVERSO da questo
  //    vengono ignorati: cosi' un fetch stale (es. del torneo precedente
  //    appena cancellato) non puo' MAI sovrascrivere lo stato del torneo nuovo.
  const activeIdRef = useRef<string | null>(null);

  // ============== FETCH FULL STATE ==============
  const fetchTournamentState = useCallback(
    async (tournamentId: string) => {
      // 🛡️ Guard anti-stale: se nel frattempo e' stato impostato un altro
      //    torneo di sessione, ignoriamo questo fetch.
      if (activeIdRef.current && activeIdRef.current !== tournamentId) {
        return null;
      }
      const [tRes, pRes, mRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase
          .from("tournament_participants")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("slot", { ascending: true }),
        supabase
          .from("tournament_matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("round", { ascending: true })
          .order("match_index", { ascending: true }),
      ]);

      if (tRes.error) throw tRes.error;
      if (!tRes.data) {
        setTournament(null);
        setParticipants([]);
        setMatches([]);
        return null;
      }

      // Enrich participants with profile data (avatar/nickname)
      const participantIds = (pRes.data ?? []).map((p: any) => p.profile_id);
      let profilesById = new Map<string, ParticipantRow["profile"]>();
      if (participantIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nickname, full_name, avatar_url, photos, is_admin_profile")
          .in("id", participantIds);
        for (const p of profilesData ?? []) {
          profilesById.set(p.id, p as any);
        }
      }

      const enrichedParticipants = (pRes.data ?? []).map((p: any) => ({
        ...p,
        profile: profilesById.get(p.profile_id),
      })) as ParticipantRow[];

      setTournament(tRes.data as TournamentRow);
      setParticipants(enrichedParticipants);
      setMatches((mRes.data ?? []) as MatchRow[]);
      return tRes.data as TournamentRow;
    },
    []
  );

  // 🚫 NESSUN fetch-al-mount del torneo esistente (no-resume policy).
  //    Quando l'utente esce da un torneo, quello "svanisce" — non lo
  //    ricarichiamo mai. Un nuovo torneo nasce SOLO via createTournament, che
  //    lato DB cancella ogni torneo precedente (clean slate). Questo elimina
  //    alla radice il bug di "rientro nel torneo precedente".

  // ============== REALTIME SUBSCRIPTION ==============
  useEffect(() => {
    if (!tournament?.id) return;
    const tid = tournament.id;

    // 🐛 Canale STATICO (no Date.now()): cosi' una sola subscription per torneo.
    channelRef.current = supabase
      .channel(`tournament_${tid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${tid}` },
        () => {
          fetchTournamentState(tid).catch(console.error);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${tid}` },
        () => {
          fetchTournamentState(tid).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tournament?.id, fetchTournamentState]);

  // ============== HEARTBEAT ==============
  useEffect(() => {
    if (!tournament?.id || tournament.status !== "active") return;
    const tid = tournament.id;

    const tick = async () => {
      try {
        await supabase.rpc("tournament_heartbeat" as any, { _tournament_id: tid });
      } catch (e) {
        console.warn("tournament_heartbeat failed:", e);
      }
    };

    // tick immediato + ogni 30s
    tick();
    heartbeatTimerRef.current = setInterval(tick, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [tournament?.id, tournament?.status]);

  // ============== NPC AUTO-RESOLVE POLLING ==============
  // 🛡️ matches in un REF stabile: il useEffect del polling dipende SOLO da
  //    tournament.id/status, NON da matches. Altrimenti ogni update realtime
  //    aggiornava la ref di matches → cleanup+rerun del useEffect → il
  //    setInterval ripartiva da capo da 0 → con update frequenti il tick non
  //    scattava mai → match NPC scaduti mai risolti.
  const matchesRef = useRef<MatchRow[]>([]);
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  useEffect(() => {
    if (!tournament?.id || tournament.status !== "active") return;

    const tick = async () => {
      const now = Date.now();
      const toResolve = matchesRef.current.filter(
        (m) =>
          !m.is_user_match &&
          m.status === "in_progress" &&
          m.scheduled_end_at &&
          new Date(m.scheduled_end_at).getTime() <= now
      );

      for (const m of toResolve) {
        try {
          await supabase.rpc("resolve_npc_match" as any, { _match_id: m.id });
        } catch (e) {
          console.warn(`resolve_npc_match ${m.id} failed:`, e);
        }
      }
    };

    npcPollTimerRef.current = setInterval(tick, NPC_POLL_INTERVAL_MS);
    tick();

    // 🔄 Trigger extra: quando l'utente torna sulla tab dopo essere stato
    //    altrove (es. ha minimizzato il browser), forza un tick subito.
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    const onFocus = () => tick();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      if (npcPollTimerRef.current) {
        clearInterval(npcPollTimerRef.current);
        npcPollTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [tournament?.id, tournament?.status]);

  // ============== USER MATCH SELECTOR ==============
  // Il match attualmente "giocabile" o "in attesa" per l'utente. NON filtriamo
  // per round perche' i lati left/right del bracket avanzano indipendentemente:
  // l'utente potrebbe essere gia' in semifinale anche se l'altro lato e' ancora
  // ai quarti (current_round resta 1). Filtrando per round perderemmo il match
  // semifinale dell'utente. Filtra solo per is_user_match + status attivo.
  const userMatch = matches.find(
    (m) =>
      m.is_user_match &&
      (m.status === "waiting" || m.status === "in_progress")
  );

  // ============== ACTIONS ==============

  // 🚀 Crea torneo: selezione 7 admin random + bracket + predetermined winners
  const createTournament = useCallback(
    async (gameType: GameType): Promise<TournamentRow> => {
      setLoading(true);
      setError(null);
      try {
        // 1) Fetch all admin profiles
        const { data: adminsData, error: aErr } = await supabase
          .from("profiles")
          .select("id, nickname, full_name, avatar_url, photos, is_admin_profile, game_elo")
          .eq("is_admin_profile", true);
        if (aErr) throw aErr;
        const admins = (adminsData ?? []) as AdminProfile[];
        if (admins.length < 7) {
          throw new Error(`Servono almeno 7 profili admin (trovati ${admins.length}).`);
        }

        // 2) Compute simulated ELOs
        const eloMap = computeAdminElos(admins.map((a) => ({ id: a.id })));
        const adminsWithElo = admins.map((a) => ({
          ...a,
          elo: eloMap.get(a.id) ?? 1200,
        }));

        // 3) Random pick 7 admin (Fisher-Yates su una copia)
        const shuffled = [...adminsWithElo];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const picked = shuffled.slice(0, 7);

        // 4) ELO utente dal profilo
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("game_elo")
          .eq("id", currentUserId!)
          .maybeSingle();
        const userElo = userProfile?.game_elo ?? 1200;

        // 5) Predetermined winners per i 3 quarti NPC (non quello dell'utente).
        //    Logica: coin flip pesato per ELO. DIFFICULTY_BOOST applicato sui
        //    match dove c'e' l'utente non e' rilevante qui (i quarti NPC sono
        //    admin-vs-admin), quindi semplice formula ELO.
        //    L'ordine dei winners deve combaciare con quello atteso dalla RPC:
        //    sono i 3 quarti NON-utente nell'ordine naturale (1..4 saltando user_pair).
        //    PROBLEMA: il client non sa ancora qual e' user_slot (lo decide il server).
        //    SOLUZIONE: il client predetermina i vincitori per OGNI possibile coppia di
        //    quarti, inviando 3 vincitori pre-decisi che la RPC poi mappa.
        //
        //    Strategia piu' semplice: definiamo l'ordine dei quarti NPC come segue:
        //    Quarter 1 (pair 1-2): admins[0] vs admins[1]
        //    Quarter 2 (pair 3-4): admins[2] vs admins[3]
        //    Quarter 3 (pair 5-6): admins[4] vs admins[5]
        //    Quarter 4 (pair 7-8): admins[6] vs admins[?]
        //    L'utente occupera' uno slot dispari (1,3,5,7) sostituendo uno degli admin
        //    appropriati. La RPC fa la mappatura giusta saltando il pair utente.
        //
        //    Vincitori predeterminati: per ogni "pair NPC" decidiamo subito.
        //    Includiamo SEMPRE 3 vincitori per i 3 quarti NPC + 3 placeholder per
        //    semi/finale (la RPC li ricalcolera' in advance_tournament basandosi
        //    sugli ELO snapshot, quindi i placeholder finali sono ignorati).
        const pickWinner = (a: { id: string; elo: number }, b: { id: string; elo: number }) => {
          const pa = 1 / (1 + Math.pow(10, (b.elo - a.elo) / 400));
          return Math.random() < pa ? a.id : b.id;
        };

        // I 4 "pair" quarter: admins[0..1], admins[2..3], admins[4..5], admins[6] + filler
        // Per il pair dove ci sara' l'utente, il vincitore predeterminato NON viene
        // usato (lo decide la partita reale), ma dobbiamo comunque inviare un id valido
        // → mandiamo l'id dell'admin di quel pair (entrambi gli id sono validi per la
        // validazione sanity, e la RPC del nostro "pair utente" non leggera' nemmeno
        // il predetermined). PERO' la RPC valida che ogni predetermined_winner sia in
        // _admin_ids: usiamo l'admin[0] di quel pair (sicuro).
        //
        // Predetermined_winners[0..2] = vincitori dei 3 quarti NON-utente
        // Predetermined_winners[3..5] = placeholder (riempiti dalla RPC su advance)
        const quarterPairs: Array<[string, string, number, number]> = [
          [picked[0].id, picked[1].id, picked[0].elo, picked[1].elo],
          [picked[2].id, picked[3].id, picked[2].elo, picked[3].elo],
          [picked[4].id, picked[5].id, picked[4].elo, picked[5].elo],
          // 4° pair: ne abbiamo solo 1 admin disponibile (picked[6]) + 1 spot per utente.
          // La RPC sostituisce uno dei due slot 7-8 con l'utente. Ma serve un secondo
          // id per il pickWinner. Compromesso: passiamo picked[6] in DUE posizioni:
          // se l'utente va in slot 7, picked[6] e' player_b; viceversa. Il
          // predetermined "fittizio" e' picked[6] (auto-vince contro se stesso ma
          // tanto la RPC lo ignora se il pair contiene l'utente).
          [picked[6].id, picked[6].id, picked[6].elo, picked[6].elo],
        ];

        const predeterminedQuartersAll = quarterPairs.map(([aId, bId, aElo, bElo]) =>
          pickWinner({ id: aId, elo: aElo }, { id: bId, elo: bElo })
        );

        // La RPC vuole 4 vincitori, uno per quarter (pair 1..4). Il pair
        // utente ha un valore "fittizio" che la RPC ignora.
        const predeterminedWinners = [
          predeterminedQuartersAll[0], // quarter 1 winner (pair 1-2)
          predeterminedQuartersAll[1], // quarter 2 winner (pair 3-4)
          predeterminedQuartersAll[2], // quarter 3 winner (pair 5-6)
          predeterminedQuartersAll[3], // quarter 4 winner (pair 7-8)
        ];

        // 6) Chiama la RPC
        const { data, error: rpcErr } = await supabase.rpc("create_tournament" as any, {
          _game_type: gameType,
          _admin_ids: picked.map((p) => p.id),
          _admin_elos: picked.map((p) => p.elo),
          _user_elo: userElo,
          _predetermined_winners: predeterminedWinners,
        });
        if (rpcErr) throw rpcErr;

        const row = Array.isArray(data) ? data[0] : data;
        const tournamentId = row?.tournament_id as string;
        if (!tournamentId) throw new Error("create_tournament: no tournament_id returned");

        // 🛡️ Da ora SOLO questo torneo e' valido: i fetch per id diversi
        //    (es. del torneo precedente appena cancellato) vengono ignorati.
        activeIdRef.current = tournamentId;

        // 7) Fetch full state
        const t = await fetchTournamentState(tournamentId);
        if (!t) throw new Error("Tournament created but fetch failed");
        return t;
      } catch (e: any) {
        setError(e?.message ?? String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, fetchTournamentState]
  );

  const startUserMatch = useCallback(async () => {
    if (!userMatch) return;
    const { error: e } = await supabase.rpc("start_user_match" as any, { _match_id: userMatch.id });
    if (e) console.error("start_user_match failed:", e);
    if (tournament?.id) await fetchTournamentState(tournament.id);
  }, [userMatch, tournament?.id, fetchTournamentState]);

  const reportUserResult = useCallback(
    async (userWon: boolean) => {
      if (!userMatch) return;
      const { error: e } = await supabase.rpc("report_user_match_result" as any, {
        _match_id: userMatch.id,
        _user_won: userWon,
      });
      if (e) console.error("report_user_match_result failed:", e);
      if (tournament?.id) await fetchTournamentState(tournament.id);
    },
    [userMatch, tournament?.id, fetchTournamentState]
  );

  const abandonTournament = useCallback(
    async (reason: string = "voluntary") => {
      if (!tournament?.id) return;
      const { error: e } = await supabase.rpc("abandon_tournament" as any, {
        _tournament_id: tournament.id,
        _reason: reason,
      });
      if (e) console.error("abandon_tournament failed:", e);
      await fetchTournamentState(tournament.id);
    },
    [tournament?.id, fetchTournamentState]
  );

  const claimRewards = useCallback(async () => {
    if (!tournament?.id) return null;
    const { data, error: e } = await supabase.rpc("claim_tournament_rewards" as any, {
      _tournament_id: tournament.id,
    });
    if (e) {
      console.error("claim_tournament_rewards failed:", e);
      return null;
    }
    await fetchTournamentState(tournament.id);
    return Array.isArray(data) ? data[0] : data;
  }, [tournament?.id, fetchTournamentState]);

  const clearTournament = useCallback(() => {
    activeIdRef.current = null;
    setTournament(null);
    setParticipants([]);
    setMatches([]);
  }, []);

  // 🔧 ADMIN/TEST: forza la conclusione immediata di un match NPC (anche prima
  //    dello scadere del tempo). Usa resolve_npc_match con _force=true.
  const forceResolveMatch = useCallback(
    async (matchId: string) => {
      try {
        await supabase.rpc("resolve_npc_match" as any, { _match_id: matchId, _force: true });
      } catch (e) {
        console.warn("forceResolveMatch failed:", e);
      }
      if (tournament?.id) await fetchTournamentState(tournament.id);
    },
    [tournament?.id, fetchTournamentState]
  );

  return {
    tournament,
    participants,
    matches,
    userMatch,
    loading,
    error,
    createTournament,
    startUserMatch,
    reportUserResult,
    abandonTournament,
    claimRewards,
    clearTournament,
    forceResolveMatch,
  };
}
