import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, X, Loader2, Clock, Gamepad2 } from "lucide-react";
import { OpponentSearch } from "./OpponentSearch";
import { TrisBoard } from "./TrisBoard";
import { CheckersBoard } from "./CheckersBoard";
import { OthelloBoard } from "./OthelloBoard";
import { EloLeaderboard } from "./EloLeaderboard";
import { TournamentFlow } from "@/components/tournament/TournamentFlow";
import { supabase } from "@/integrations/supabase/client";
import { getStoredUserId } from "@/lib/storedSession";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { InsufficientCreditsBanner } from "@/components/chat/InsufficientCreditsBanner";
import trisIcon from "@/assets/tris-icon.png";
import damaIcon from "@/assets/dama-icon.png";
import othelloIcon from "@/assets/othello-icon.png";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo?: number;
}

export const TrisGameBanner = ({ variant = "banner" }: { variant?: "banner" | "page" }) => {
  const [showBanner, setShowBanner] = useState(variant === "page");
  // 🏆 Aggiunto stato 'tournament' che gestisce l'intero flusso torneo
  //    delegato al componente TournamentFlow (bracket 8-player).
  const [gameState, setGameState] = useState<"idle" | "selecting" | "searching" | "playing" | "tournament">("idle");
  const [selectedGame, setSelectedGame] = useState<"tris" | "dama" | "othello" | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  // Banner "Crediti insufficienti" mostrato quando l'utente cerca di
  // giocare una partita extra senza i 2 crediti necessari (al posto del
  // toast rosso in basso a destra).
  const [showInsufficientCreditsBanner, setShowInsufficientCreditsBanner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 🔒 Anti-bypass: vero solo dopo che checkGamesRemaining e' andato a buon fine
  // almeno una volta. Finche' e' false, il pulsante "Iniziare a giocare" e'
  // disabilitato con spinner. Altrimenti, mentre la pagina carica, il bottone
  // mostra il default "Iniziare a giocare" (perche' gamesPlayed=0 e limit=5,
  // quindi 0<5 e needsCredits=false) e un click rapido bypassava il check crediti.
  const [gamesDataLoaded, setGamesDataLoaded] = useState(false);
  // 📊 Tipo di pagamento della prossima partita: settato in handleStartGame
  // ('free' = partite giornaliere free, 'credits' = pagata 2 crediti,
  // 'premium' = abbonamento illimitato). Salvato in tris_games.last_game_payment_type
  // quando inizia la partita, mostrato nel pannello admin "Partite".
  const nextGamePaymentTypeRef = useRef<'free' | 'credits' | 'premium'>('free');
  const { toast } = useToast();
  const { credits } = useCredits();
  const navigate = useNavigate();

  // In modalità pagina la chiusura riporta alla home; come banner nasconde il riquadro.
  const exitGames = () => {
    if (variant === "page") navigate("/");
    else setShowBanner(false);
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        
        console.log('🎮 Fetching current user profile for:', session.user.id);
        // Fetch current user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (error) {
          console.error('❌ Error fetching profile:', error);
        } else if (profile) {
          console.log('✅ Current user profile loaded:', profile.nickname);
          setCurrentUserProfile(profile);
        }
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    checkGamesRemaining();
  }, []);

  // Ricarica i dati quando il banner si riapre
  useEffect(() => {
    if (showBanner && gameState === "idle") {
      checkGamesRemaining();
    }
  }, [showBanner, gameState]);

  // Mantieni il saldo locale sincronizzato per feedback immediato
  useEffect(() => {
    if (credits?.balance !== undefined) {
      setUserCredits(credits.balance);
    }
  }, [credits?.balance]);

  // Considera attivo SOLO se is_premium=true E (mancante/futuro) premium_expires_at.
  // Se l'abbonamento è scaduto ma is_premium non e' stato aggiornato (dato sporco),
  // hasActiveSubscription torna comunque false → niente unlimited di rimbalzo.
  const hasActiveSubscription = () => {
    if (!credits?.is_premium) return false;
    if (!credits.premium_expires_at) {
      // Senza data di scadenza: lo trattiamo come attivo SOLO se la subscription
      // è effettivamente settata (monthly o weekly). subscription_type='none'
      // con is_premium=true è dato sporco e non deve dare unlimited.
      return credits.subscription_type === 'monthly' || credits.subscription_type === 'weekly';
    }
    return new Date(credits.premium_expires_at) > new Date();
  };

  const hasUnlimitedGames = () => Boolean(
    hasActiveSubscription() &&
    credits?.subscription_type === 'monthly' &&
    (!credits.premium_tier || credits.premium_tier === 'premium')
  );

  // Calcola il limite di partite in base all'abbonamento
  const getGameLimit = () => {
    if (hasUnlimitedGames()) return Number.POSITIVE_INFINITY; // Premium illimitato
    if (hasActiveSubscription() && credits?.subscription_type === 'monthly' && credits.premium_tier === 'standard') return 20; // Platino
    if (hasActiveSubscription() && credits?.subscription_type === 'weekly') return 10;
    return 5; // Free
  };

  // Evita il flash iniziale di 5/5: non mostrare valori finché i crediti non sono caricati
  const getDisplayLimit = () => {
    return credits ? getGameLimit() : null;
  };

  const checkGamesRemaining = async () => {
    console.log('🔍 checkGamesRemaining - START');
    let userId = getStoredUserId();
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
    if (!userId) {
      console.log('❌ checkGamesRemaining - No session');
      return;
    }

    console.log('🔍 Querying tris_games for user:', userId);

    // 🔧 FIX BUG DUPLICATI:
    // Prima usavamo .maybeSingle() che ritorna null+PGRST116 se ci sono 2+ righe.
    // Il codice non gestiva PGRST116 → faceva INSERT → creava una ENNESIMA riga →
    // spirale di duplicati che rendeva impossibile leggere correttamente lo stato.
    // Ora prendiamo TUTTE le righe ordinate per updated_at DESC e usiamo la piu'
    // recente. Se ci sono duplicati li puliamo (mantieni solo la piu' recente).
    const { data: rows, error } = await supabase
      .from("tris_games")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("❌ Error querying tris_games:", error);
      return;
    }

    console.log(`📊 Found ${rows?.length ?? 0} tris_games row(s) for user`);

    // 🔧 FIX MERGE DUPLICATI:
    // Prima la pulizia tiene la più recente by updated_at e DELETE le altre.
    // Problema: una INSERT spuria di una RPC (es. award_top1_trophy con
    // ON CONFLICT DO NOTHING inefficace per mancanza di UNIQUE) crea una riga
    // VUOTA "più recente" → si cancellano le righe vecchie CON LE STATS!
    // Ora aggreghiamo (max) tutte le stats sulla riga più recente PRIMA di
    // cancellare le altre, così non perdiamo mai nulla.
    let data = rows?.[0] as any;
    if (rows && rows.length > 1) {
      const keep = rows[0] as any;
      const idsToDelete = rows.slice(1).map((r: any) => r.id);
      console.warn(`🧹 Merging ${rows.length} righe tris_games (mantengo ${keep.id})`);

      // Max di ogni stat sull'insieme di tutte le righe → niente perdita dati
      const max = (key: string) =>
        Math.max(...(rows as any[]).map((r) => r?.[key] ?? 0));
      const latestNonNull = (key: string) => {
        const sorted = (rows as any[])
          .filter((r) => r?.[key])
          .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
        return sorted[0]?.[key] ?? null;
      };

      const aggregated: any = {
        games_played_today: max("games_played_today"),
        tris_wins: max("tris_wins"),
        tris_losses: max("tris_losses"),
        tris_draws: max("tris_draws"),
        dama_wins: max("dama_wins"),
        dama_losses: max("dama_losses"),
        dama_draws: max("dama_draws"),
        top_1_trophies: max("top_1_trophies"),
        last_game_at: latestNonNull("last_game_at"),
        last_game_payment_type: latestNonNull("last_game_payment_type"),
      };

      const { data: updated } = await supabase
        .from("tris_games")
        .update(aggregated)
        .eq("id", keep.id)
        .select()
        .maybeSingle();

      await supabase.from("tris_games").delete().in("id", idsToDelete);

      data = updated ?? { ...keep, ...aggregated };
      console.log("✅ Merge duplicati completato:", aggregated);
    }

    if (!data) {
      console.log('📝 No tris_games record found, creating new one');
      const today = new Date().toISOString().split("T")[0];
      const { data: insertedRows, error: insertError } = await supabase
        .from("tris_games")
        .insert({
          user_id: userId,
          games_played_today: 0,
          last_reset_date: today,
        })
        .select();

      if (insertError) {
        console.error("❌ Error creating tris_games record:", insertError);
      } else {
        console.log('✅ tris_games row creata:', insertedRows);
      }
      setGamesPlayed(0);
    } else {
      const today = new Date().toISOString().split("T")[0];
      console.log('📊 Found tris_games data:', {
        id: data.id,
        games_played_today: data.games_played_today,
        last_reset_date: data.last_reset_date,
        today: today
      });

      if (data.last_reset_date !== today) {
        console.log('🔄 Date mismatch - resetting games');
        const { error: updateError } = await supabase
          .from("tris_games")
          .update({
            games_played_today: 0,
            last_reset_date: today,
          })
          .eq("id", data.id);

        if (updateError) {
          console.error("❌ Error resetting daily games:", updateError);
        }
        console.log('✅ Setting gamesPlayed to 0 (reset)');
        setGamesPlayed(0);
      } else {
        console.log('✅ Date matches - setting gamesPlayed to:', data.games_played_today);
        setGamesPlayed(data.games_played_today);
        const limit = getGameLimit();
        if (data.games_played_today >= limit) {
          const resetDate = new Date(data.last_reset_date);
          resetDate.setDate(resetDate.getDate() + 1);
          setNextResetTime(resetDate);
        }
      }
    }
    // Sblocca il pulsante "Iniziare a giocare": ora gamesPlayed riflette
    // il vero stato del DB e i check di handleStartGame sono affidabili.
    setGamesDataLoaded(true);
    console.log('🔍 checkGamesRemaining - END');
  };

  const handleStartGame = async () => {
    // 🔒 ANTI-BYPASS: blocca click prima che i dati siano pronti.
    // Senza questo guard, in fase di caricamento gamesPlayed=0 (default) e
    // getGameLimit()=5 (default free) → 0<5 → needsCredits=false → il check
    // 'gamesPlayed >= limit' (sotto) e' false → setGameState('selecting') subito
    // senza scalare i 2 crediti. Un utente furbo poteva ricaricare la pagina
    // e cliccare nei millisecondi giusti per giocare gratis.
    if (!credits || !gamesDataLoaded) {
      console.warn('⚠️ handleStartGame bloccato: dati non ancora caricati');
      return;
    }

    const limit = getGameLimit();

    // Solo monthly premium (tier premium) ha giochi illimitati
    if (hasUnlimitedGames()) {
      nextGamePaymentTypeRef.current = 'premium';
      setGameState("selecting");
      return;
    }

    if (gamesPlayed >= limit) {
      // Check if user has enough credits to play
      if (userCredits < 2) {
        // Banner centrato con tasto "Ricarica o Abbonati" al posto del
        // toast rosso (richiesta utente: piu' visibile e con call-to-action).
        setShowInsufficientCreditsBanner(true);
        return;
      }

      // Scala 2 crediti tramite la funzione RPC: l'update diretto sulla
      // tabella user_credits è bloccato dalle policy di sicurezza.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: deducted, error: deductError } = await supabase.rpc("deduct_credits", {
        _user_id: session.user.id,
        _amount: 2,
      });

      if (deductError || deducted !== true) {
        toast({
          title: "Crediti insufficienti",
          description: "Non è stato possibile usare i 2 crediti. Riprova.",
          variant: "destructive",
        });
        return;
      }

      setUserCredits((prev) => Math.max(0, prev - 2));

      nextGamePaymentTypeRef.current = 'credits';
    } else {
      // partita free (entro il limite giornaliero)
      nextGamePaymentTypeRef.current = 'free';
    }
    setGameState("selecting");
  };

  const handleGameSelect = (game: "tris" | "dama" | "othello") => {
    console.log('🎮 Game selected:', game);
    setSelectedGame(game);
    setGameState("searching");
  };

   // Incrementa le partite giocate - ASYNC per garantire persistenza.
   //
   // ⚠️ BUG STORICO: la versione precedente faceva UPDATE senza .select(), quindi
   // se la riga non esisteva (o RLS bloccava) l'UPDATE toccava 0 righe SENZA
   // dare errore. setGamesPlayed(newGamesPlayed) aggiornava la UI temporaneamente,
   // ma alla fine partita checkGamesRemaining ri-leggeva dal DB e ripristinava
   // il counter a 0 — effetto "le partite non scalano".
   //
   // FIX: .select() obbligatorio + INSERT di fallback se la riga non esiste +
   // log dettagliati per diagnostica. Uso getStoredUserId per evitare il
   // noto hang di supabase.auth.getSession().
   const incrementGamesPlayed = async (): Promise<number> => {
     let userId = getStoredUserId();
     if (!userId) {
       const { data: { session } } = await supabase.auth.getSession();
       userId = session?.user?.id ?? null;
     }
     if (!userId) throw new Error('No session');

     const newGamesPlayed = gamesPlayed + 1;
     const today = new Date().toISOString().split("T")[0];

     console.log('🎯 incrementGamesPlayed START', {
       userId,
       gamesPlayedBefore: gamesPlayed,
       newGamesPlayed,
       today,
     });

     // 1) Trova TUTTE le righe per pulire duplicati e prendere la piu' recente
     const { data: existingRows, error: selectErr } = await supabase
       .from("tris_games")
       .select("*")
       .eq("user_id", userId)
       .order("updated_at", { ascending: false });

     if (selectErr) {
       console.error('❌ SELECT pre-update error:', selectErr);
       throw selectErr;
     }

     console.log(`📊 Pre-update rows: ${existingRows?.length ?? 0}`);

     // 🔧 FIX MERGE DUPLICATI: aggrega le stats (max) sulla riga più recente
     // PRIMA di cancellare le altre, così non perdiamo wins/losses/trophies
     // accumulate in righe duplicate create da INSERT spuri delle RPC.
     let targetRow = (existingRows as any[])?.[0];
     if (existingRows && existingRows.length > 1) {
       const keep = existingRows[0] as any;
       const idsToDelete = existingRows.slice(1).map((r: any) => r.id);
       console.warn(`🧹 Merge ${existingRows.length} duplicati pre-update (keep ${keep.id})`);

       const max = (key: string) => Math.max(...(existingRows as any[]).map((r) => r?.[key] ?? 0));
       const latestNonNull = (key: string) => {
         const sorted = (existingRows as any[])
           .filter((r) => r?.[key])
           .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
         return sorted[0]?.[key] ?? null;
       };

       const aggregated: any = {
         games_played_today: max("games_played_today"),
         tris_wins: max("tris_wins"),
         tris_losses: max("tris_losses"),
         tris_draws: max("tris_draws"),
         dama_wins: max("dama_wins"),
         dama_losses: max("dama_losses"),
         dama_draws: max("dama_draws"),
         top_1_trophies: max("top_1_trophies"),
         last_game_at: latestNonNull("last_game_at"),
         last_game_payment_type: latestNonNull("last_game_payment_type"),
       };

       const { data: mergedRow } = await supabase
         .from("tris_games")
         .update(aggregated)
         .eq("id", keep.id)
         .select()
         .maybeSingle();
       await supabase.from("tris_games").delete().in("id", idsToDelete);
       targetRow = mergedRow ?? { ...keep, ...aggregated };
     }

     // 2) UPDATE per id (non per user_id) se la riga esiste, altrimenti INSERT
     if (targetRow) {
       console.log(`📝 UPDATE su id=${targetRow.id} (games_played_today: ${targetRow.games_played_today} → ${newGamesPlayed})`);
       const { data: updatedRows, error: updateErr } = await supabase
         .from("tris_games")
         .update({
           games_played_today: newGamesPlayed,
           last_reset_date: today,
           last_game_at: new Date().toISOString(),
           last_game_payment_type: nextGamePaymentTypeRef.current,
         } as any)
         .eq("id", targetRow.id)
         .select();

       if (updateErr) {
         console.error('❌ incrementGamesPlayed UPDATE error:', updateErr);
         throw updateErr;
       }

       if (!updatedRows || updatedRows.length === 0) {
         console.error('❌ UPDATE per id ha toccato 0 righe — RLS sta bloccando');
         throw new Error(
           "UPDATE su tris_games bloccato dalle RLS. " +
           "Apri Admin → Diagnostica Account per vedere lo stato."
         );
       }

       console.log('✅ UPDATE successful:', updatedRows[0]);
     } else {
       console.warn('⚠️ Nessuna riga tris_games, faccio INSERT');
       const { data: insertedRow, error: insertErr } = await supabase
         .from("tris_games")
         .insert({
           user_id: userId,
           games_played_today: newGamesPlayed,
           last_reset_date: today,
           last_game_at: new Date().toISOString(),
           last_game_payment_type: nextGamePaymentTypeRef.current,
         } as any)
         .select()
         .maybeSingle();

       if (insertErr) {
         console.error('❌ INSERT error:', insertErr);
         throw new Error(
           `Impossibile salvare le partite (INSERT errore: ${insertErr.message})`
         );
       }
       console.log('✅ INSERT successful:', insertedRow);
     }

     // Aggiorna lo stato locale SOLO dopo il successo del database
     setGamesPlayed(newGamesPlayed);

     // Check if reached free limit
     const limit = getGameLimit();
     if (newGamesPlayed >= limit && !hasUnlimitedGames()) {
       const tomorrow = new Date();
       tomorrow.setDate(tomorrow.getDate() + 1);
       setNextResetTime(tomorrow);
     }

     return newGamesPlayed;
   };
 
   // Retry mechanism per incrementGamesPlayed
   const incrementGamesPlayedWithRetry = async (retries = 3): Promise<number> => {
     for (let i = 0; i < retries; i++) {
       try {
         return await incrementGamesPlayed();
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
       }
     }
     throw new Error('Max retries reached');
   };

   // 🏆 Avvio del flusso torneo: consuma il "biglietto" (partita giornaliera o
   //    2 crediti gia' pagati in handleStartGame) e passa a stato 'tournament'.
   //    Stesso pattern di handleOpponentFound per la consistenza.
   const handleStartTournament = async () => {
     try {
       const unlimited = hasUnlimitedGames();
       if (!unlimited) {
         await incrementGamesPlayedWithRetry();
       }
       setGameState("tournament");
     } catch (err) {
       console.error('🚨 Errore avvio torneo:', err);
       toast({
         title: "Errore",
         description: "Impossibile avviare il torneo. Riprova.",
         variant: "destructive",
       });
     }
   };

   const handleOpponentFound = async (foundOpponent: Profile) => {
     try {
       // 🔍 LOG DIAGNOSTICO: capire perche' (eventualmente) il counter
       // non scala. Mostra lo stato dei credits all'istante del check.
       const unlimited = hasUnlimitedGames();
       console.log('🎮 handleOpponentFound', {
         hasUnlimitedGames: unlimited,
         willIncrement: !unlimited,
         credits: credits ? {
           is_premium: credits.is_premium,
           subscription_type: credits.subscription_type,
           premium_tier: credits.premium_tier,
           premium_expires_at: credits.premium_expires_at,
         } : 'null',
         gamesPlayed,
       });

       // Il Premium mensile e' davvero illimitato: non incrementiamo il contatore giornaliero.
       if (!unlimited) {
         // CRITICO: Attendere l'aggiornamento PRIMA di avviare il gioco
         await incrementGamesPlayedWithRetry();
       } else {
         console.warn('⚠️ Increment SKIPPATO perche hasUnlimitedGames=true');
         // Tracciamo comunque last_game_at + payment_type='premium' su tris_games
         // per il pannello admin "Partite". Best-effort: errori non bloccanti.
         try {
           let pUserId = getStoredUserId();
           if (!pUserId) {
             const { data: { session } } = await supabase.auth.getSession();
             pUserId = session?.user?.id ?? null;
           }
           if (pUserId) {
             const today = new Date().toISOString().split("T")[0];
             const { data: existing } = await supabase
               .from("tris_games")
               .select("id")
               .eq("user_id", pUserId)
               .order("updated_at", { ascending: false })
               .limit(1);
             if (existing && existing.length > 0) {
               await supabase
                 .from("tris_games")
                 .update({
                   last_game_at: new Date().toISOString(),
                   last_game_payment_type: 'premium',
                 } as any)
                 .eq("id", existing[0].id);
             } else {
               await supabase.from("tris_games").insert({
                 user_id: pUserId,
                 games_played_today: 0,
                 last_reset_date: today,
                 last_game_at: new Date().toISOString(),
                 last_game_payment_type: 'premium',
               } as any);
             }
           }
         } catch (e) {
           console.warn('Premium last_game tracking (non bloccante):', e);
         }
       }
       
       setOpponent(foundOpponent);
       setGameState("playing");
     } catch (error) {
       console.error('Errore aggiornamento partite:', error);
       toast({
         title: "Errore",
         description: "Impossibile avviare la partita. Riprova.",
         variant: "destructive",
       });
       setGameState("idle");
     }
  };

  const handleGameEnd = async (result: "win" | "lose" | "draw") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 📊 Incrementa stats vittoria/sconfitta/pareggio per gioco specifico
    // (tris o dama). Best-effort: errori non bloccanti per non rovinare la UX.
    if (selectedGame) {
      try {
        const { error: statErr } = await supabase.rpc('increment_game_stat' as any, {
          p_user_id: session.user.id,
          p_game: selectedGame,
          p_result: result,
        });
        if (statErr) console.warn('increment_game_stat warning (non bloccante):', statErr);
      } catch (e) {
        console.warn('increment_game_stat exception (non bloccante):', e);
      }
    }

    // 🏆 NUOVO SISTEMA: snapshot giornaliero. Niente piu' trofei alla
    // "transizione" (era exploitabile perdendo apposta per risalire).
    // Chi e' #1 a mezzanotte UTC riceve 1 trofeo "champion of the day".
    // Chiamiamo la RPC sia qui (post-partita) sia da EloLeaderboard (apertura
    // pagina) per aumentare le occasioni di assegnazione + snapshot della
    // classifica, così non dipendiamo solo dal fatto che qualcuno apra la
    // classifica per scatenare lo snapshot giornaliero.
    try {
      await supabase.rpc('award_daily_top1_if_needed' as any);
    } catch (e) {
      console.warn('award_daily_top1_if_needed (post-partita):', e);
    }

    // Award credits if win
    if (result === "win") {
      // Accredita 6 crediti tramite la RPC (importo negativo = aggiunta):
      // l'update diretto su user_credits è bloccato dalle policy di sicurezza.
      const { error: awardError } = await supabase.rpc("deduct_credits", {
        _user_id: session.user.id,
        _amount: -6,
      });

      if (!awardError) {
        setUserCredits((prev) => prev + 6);
        toast({
          title: "🎉 Complimenti!",
          description: "Hai vinto la sfida e guadagnato +6 crediti!",
        });
      }
    } else if (result === "draw") {
      toast({
        title: "Pareggio!",
        description: "Riprova la prossima volta.",
      });
    } else {
      toast({
        title: "Hai perso!",
        description: "Non arrenderti, riprova la prossima volta.",
      });
    }

    // Ricarica i dati dal DB prima di resettare
    await checkGamesRemaining();

    // 🚀 Reset IMMEDIATO: torna SUBITO alla pagina Sfida.
    //    Prima c'erano 3s di delay che combinati con i 4s dell'overlay nella
    //    board lasciavano l'utente bloccato per 7s totali con la scacchiera
    //    apparentemente "appesa". Ora torniamo immediatamente al banner di
    //    inizio dove deve di nuovo spendere 1 partita giornaliera o 2 crediti.
    setGameState("idle");
    setSelectedGame(null);
    setOpponent(null);
    if (variant !== "page") setShowBanner(false);
  };

  const getTimeRemaining = () => {
    if (!nextResetTime) return "";
    const now = new Date();
    const diff = nextResetTime.getTime() - now.getTime();
    if (diff <= 0) return "00:00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Formato breve "8h 29m" stile counter Like/Crediti per il countdown
  // mostrato sotto la riga "Partite gratuite oggi".
  const getTimeRemainingShort = () => {
    if (!nextResetTime) return "";
    const now = new Date();
    const diff = nextResetTime.getTime() - now.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    if (nextResetTime) {
      const interval = setInterval(() => {
        const now = new Date();
        if (now >= nextResetTime) {
          checkGamesRemaining();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nextResetTime]);

  if (!showBanner && gameState === "idle") {
    const limit = getDisplayLimit();
    const remaining = limit ? Math.max(0, limit - gamesPlayed) : null;
    const isPremiumUnlimited = hasUnlimitedGames();
    
    console.log('🎯 Rendering main button - gamesPlayed:', gamesPlayed, 'limit:', limit, 'remaining:', remaining);
    
    return (
      <div className="flex justify-center mb-6">
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={() => setShowBanner(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Sfida
          </Button>
          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              {isPremiumUnlimited ? (
                <span className="text-primary font-semibold">♾️ Illimitato</span>
              ) : (
                <>Partite oggi: <span className="font-bold text-primary">{remaining}/{limit}</span></>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "selecting") {
    return (
      <Card className="mb-6 mx-auto max-w-2xl p-5 md:p-6 bg-gradient-to-br from-purple-950/50 via-fuchsia-900/25 to-indigo-950/50 border-pink-500/30 shadow-[0_8px_50px_-12px_rgba(244,114,182,0.4)] backdrop-blur-sm">
        {/* Header: titolo + close */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent inline-flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-pink-300" />
            Scegli il tuo gioco
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setGameState("idle");
              if (variant !== "page") setShowBanner(false);
            }}
            className="hover:bg-white/5 text-foreground/60 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 👤 Profilo + classifica (card propria) */}
        <EloLeaderboard userId={currentUserId || undefined} />

        {/* 🎮 MODALITÀ — 3 giochi (glass coerente) + Torneo full-width */}
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-pink-300/70 mb-2.5 px-0.5">
            Modalità di gioco
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { key: "tris" as const, icon: trisIcon, label: "Tris", accent: "from-blue-400 to-blue-500", glow: "group-hover:shadow-blue-500/40 group-hover:border-blue-400/50" },
              { key: "othello" as const, icon: othelloIcon, label: "Othello", accent: "from-emerald-400 to-emerald-500", glow: "group-hover:shadow-emerald-500/40 group-hover:border-emerald-400/50" },
              { key: "dama" as const, icon: damaIcon, label: "Dama", accent: "from-red-400 to-red-500", glow: "group-hover:shadow-red-500/40 group-hover:border-red-400/50" },
            ].map((g) => (
              <button
                key={g.key}
                onClick={() => handleGameSelect(g.key)}
                className={`group flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-lg transition-all ${g.glow}`}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src={g.icon} alt={g.label} className="w-full h-full object-contain drop-shadow group-hover:scale-110 transition-transform" />
                </div>
                <span className={`text-sm font-black uppercase tracking-wide bg-gradient-to-r ${g.accent} bg-clip-text text-transparent`}>
                  {g.label}
                </span>
              </button>
            ))}
          </div>

          {/* 🏆 Torneo — pill compatta centrata, accento fuchsia/oro */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={handleStartTournament}
              className="group inline-flex items-center gap-2.5 pl-2.5 pr-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-600/25 via-pink-600/20 to-amber-500/20 border border-fuchsia-500/40 hover:border-fuchsia-400/60 hover:from-fuchsia-600/35 hover:via-pink-600/30 hover:to-amber-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-500 flex items-center justify-center shadow-md shadow-fuchsia-500/30 shrink-0">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="relative text-sm font-black uppercase tracking-wide bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-300 bg-clip-text text-transparent">
                Torneo
              </span>
            </button>
          </div>
        </div>

        {/* ℹ️ Cos'è l'ELO */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1 text-primary">Cos&apos;è l&apos;ELO?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Il sistema ELO misura il livello della tua abilità di gioco. Parti da 1200 punti: se vinci
                acquisisci +20 ELO, se perdi scendi di -10. Più alto è il tuo ELO, più dimostri la tua bravura!
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // 🏆 Phase TORNEO: delega tutto al TournamentFlow
  if (gameState === "tournament" && currentUserId) {
    return (
      <Card className="mb-6 p-0 bg-transparent border-0 shadow-none">
        <TournamentFlow
          currentUserId={currentUserId}
          onExit={async () => {
            // A torneo concluso (volontariamente o per fine match):
            //  1) Ri-leggi le partite giocate (probabile incremento in DB)
            //  2) Torna allo state idle (la pagina Sfida)
            try {
              await checkGamesRemaining();
            } catch {}
            setGameState("idle");
            setSelectedGame(null);
            setOpponent(null);
            if (variant !== "page") setShowBanner(false);
          }}
        />
      </Card>
    );
  }

  if (gameState === "searching") {
    console.log('🎮 Rendering OpponentSearch, selectedGame:', selectedGame);
    return <OpponentSearch onOpponentFound={handleOpponentFound} />;
  }

  console.log('🎮 Current state:', { gameState, opponent: opponent?.nickname, selectedGame });

  if (gameState === "playing" && opponent && selectedGame === "tris") {
    console.log('🎮 Rendering TrisBoard');
    return <TrisBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }

  if (gameState === "playing" && opponent && selectedGame === "dama") {
    console.log('🎮 Rendering CheckersBoard');
    return <CheckersBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }

  if (gameState === "playing" && opponent && selectedGame === "othello") {
    console.log('🎮 Rendering OthelloBoard');
    return <OthelloBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }


  return (
    <Card
      className="
        mb-6 p-7 relative overflow-hidden
        bg-gradient-to-br from-purple-950/40 via-fuchsia-900/25 to-indigo-950/40
        border border-pink-500/30
        shadow-[0_8px_40px_-12px_rgba(244,114,182,0.35)]
        before:absolute before:inset-0 before:pointer-events-none
        before:bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_60%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_55%)]
      "
    >
      {/* Close button: posizionato in alto a destra, fuori dall'header centrato */}
      <Button
        variant="ghost"
        size="icon"
        onClick={exitGames}
        className="absolute top-3 right-3 z-10 text-foreground/70 hover:text-foreground hover:bg-white/5"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Header centrato con icona Swords stilizzata + titolo gradient */}
      <div className="relative flex flex-col items-center text-center mb-6">
        <div className="relative mb-3">
          {/* Glow esterno */}
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-pink-500/40 via-fuchsia-500/30 to-indigo-500/40 blur-xl animate-pulse" />
          {/* Box icona */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-pink-500/40 ring-2 ring-white/10">
            <Gamepad2 className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
        <h3 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(244,114,182,0.3)]">
          Sfida gli utenti per vincere crediti e scalare la classifica
        </h3>
        {/* Linea decorativa sotto il titolo */}
        <div className="mt-2 h-[2px] w-24 rounded-full bg-gradient-to-r from-transparent via-pink-400/60 to-transparent" />
      </div>

      <div className="relative space-y-4">
        {!credits || !gamesDataLoaded ? (
          // 🔒 Anti-FOUC: skeleton finche' SIA credits SIA gamesPlayed sono pronti.
          // Senza !gamesDataLoaded mostrava brevemente "5/5" (default) prima del
          // valore reale, e il pulsante cliccabile in quei ms permetteva il bypass.
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        ) : hasUnlimitedGames() ? (
          <div className="text-center py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/15 border border-amber-400/30 backdrop-blur-sm">
            <p className="text-sm">
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent font-black">
                Giochi illimitati
              </span>
              <span className="text-muted-foreground"> con il tuo abbonamento </span>
              <span className="font-bold text-amber-400">Premium Mensile</span>
            </p>
          </div>
        ) : (
          <div className="text-center py-3 px-4 rounded-xl bg-background/40 border border-white/5 backdrop-blur-sm">
            <p className="text-lg font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(244,114,182,0.3)]">
              Partite gratuite oggi: {Math.max(0, getGameLimit() - gamesPlayed)}/{getGameLimit()}
            </p>
            {hasActiveSubscription() && credits.subscription_type === 'monthly' && credits.premium_tier === 'standard' && (
              <p className="text-[11px] mt-1 font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Abbonamento Platino
              </p>
            )}
            {hasActiveSubscription() && credits.subscription_type === 'weekly' && (
              <p className="text-[11px] mt-1 font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Bonus Premium Settimanale
              </p>
            )}
            {/* Countdown 24h: mostrato solo se l'utente ha gia' usato almeno
                una partita gratuita. */}
            {nextResetTime && gamesPlayed > 0 && (
              <div
                className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/10 text-pink-300 border border-pink-500/20"
                title="Rinnovo giornaliero"
              >
                <Clock className="h-3 w-3" />
                <span>{getTimeRemainingShort()}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottone gioca: stile diverso quando l'utente non puo' permettersi
            la partita extra (partite gratuite finite + crediti < 2). Il
            bottone resta cliccabile per mostrare il banner "Crediti
            insufficienti" con tasto "Ricarica o Abbonati", non il toast.

            🔒 ANTI-BYPASS: finche' credits / gamesDataLoaded non sono pronti
            il bottone e' DISABILITATO con spinner. Altrimenti per qualche
            millisecondo si vedeva "Iniziare a giocare" (default state) e un
            click rapido bypassava il check crediti. */}
        {(() => {
          const isLoading = !credits || !gamesDataLoaded;
          const limit = getGameLimit();
          const needsCredits =
            !isLoading && gamesPlayed >= limit && !hasUnlimitedGames();
          const cantAfford = needsCredits && userCredits < 2;
          return (
            <div className="flex justify-center pt-1">
              <Button
                onClick={handleStartGame}
                disabled={isLoading}
                className={
                  isLoading
                    ? "px-8 h-11 rounded-full bg-pink-500/30 text-foreground/60 cursor-wait"
                    : cantAfford
                    ? "px-8 h-11 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-foreground/70 cursor-not-allowed border border-pink-500/30"
                    : "px-8 h-11 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 hover:from-pink-400 hover:via-fuchsia-400 hover:to-purple-400 text-white font-bold shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 hover:scale-[1.03] transition-all border-0"
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2 drop-shadow" />
                    {needsCredits ? "Gioca con 2 crediti" : "Inizia a giocare"}
                  </>
                )}
              </Button>
            </div>
          );
        })()}
      </div>

      {/* Banner "Crediti insufficienti" — mostrato quando l'utente
          tenta di giocare senza i 2 crediti necessari. Contiene il
          tasto "Ricarica o Abbonati" che porta a /credits. */}
      <InsufficientCreditsBanner
        isVisible={showInsufficientCreditsBanner}
        onClose={() => setShowInsufficientCreditsBanner(false)}
      />
    </Card>
  );
};
