// Simulazione ELO dei profili admin con AGGIORNAMENTI ASINCRONI PER PROFILO
// + MOMENTUM CUMULATIVO (serie di vittorie/sconfitte amplificate).
//
// 🎯 SISTEMA SUPER REALISTICO: ogni admin ha
//   1) un ELO BASE intrinseco persistente (mai cambia)
//   2) una FREQUENZA di aggiornamento personale (2-8 ore — chi gioca tanto,
//      chi solo qualche volta al giorno)
//   3) un OFFSET temporale personale (sfasamento iniziale rispetto agli altri,
//      cosi' nessuno aggiorna nello stesso istante)
//   4) un DRIFT CUMULATIVO basato sulle ultime 6 "sessioni" personali:
//      somma pesata che amplifica le serie consecutive.
//      - 3 vittorie di fila (+60 ciascuna) ≈ +130 ELO
//      - serie altalena ≈ ±20-40 ELO
//      - 4 sconfitte di fila (-60 ciascuna) ≈ -130 ELO
//      Cap a ±200 ELO per evitare derive estreme (un top non puo' crollare
//      al fondo classifica in un solo "evento").
//
// Risultato: la classifica si muove veramente, gli admin top possono crollare
// dopo brutte giornate, gli admin bassi possono scalare con serie vincenti,
// e gli utenti reali (con ELO base+/-20-10) competono nello stesso campo.
//
// NESSUNA forzatura di slot: la posizione finale dipende SOLO dal valore
// numerico ELO. Un utente reale che supera un admin gli passa davanti.
//
// Distribuzione realistica dei "talenti" admin (ispirata ai rating chess online,
// che spaziano da principianti totali a Magnus Carlsen):
//   5%  top legendari   (2500-3000) — gli "elite", quasi imbattibili
//   13% alti            (2000-2500) — giocatori esperti
//   27% medio-alti      (1500-2000) — buoni giocatori
//   27% medi            (1000-1500) — giocatori medi
//   15% bassi           (600-1000)  — giocatori poco esperti
//   8%  molto bassi     (300-600)   — scarsi che perdono spesso
//   5%  principianti    (100-300)   — appena registrati, perdono quasi sempre

const HOUR_MS = 60 * 60 * 1000;
// 🔄 EPOCH = momento di "azzeramento globale" del sistema simulato.
// Spostata al 25 maggio 2026 09:42 UTC → tutti gli admin riazzerano V/S
// e ricominciano ad accumulare in tempo reale al passare dei bucket personali.
// Per "azzerare" di nuovo basta aggiornare questa data.
const EPOCH = Date.UTC(2026, 4, 25, 9, 42);

// Drift massimo TEORICO di una singola sessione (cap di sicurezza). Le sessioni
// ora hanno LUNGHEZZA VARIABILE (vedi sessionGameCount): la maggior parte sono
// brevi (1-2 partite), alcune medie (3-6), poche lunghe (7-14 partite di fila).
// Questo riproduce comportamento umano: chi gioca una mano e va, chi resta
// un'ora a fare 10 partite di seguito. Risultato: la classifica si muove
// MOLTO di più, ELO uguali quasi azzerati, swing larghi tra TOP e bottom.
const MAX_DRIFT = 280; // 14 partite × max 20 = 280 (mega-sessione tutte vittorie)

// Range di frequenza personale di "gioco" per admin:
//   FREQ_MIN_HOURS = chi gioca tanto (aggiornamento ogni 2 ore)
//   FREQ_MAX_HOURS = chi gioca poco  (aggiornamento ogni 8 ore)
// Distribuiti uniformemente sui profili admin via hash(id+"freq").
const FREQ_MIN_HOURS = 2;
const FREQ_MAX_HOURS = 8;

// Pesi del momentum cumulativo: peso[0] = bucket appena passato (piu' rilevante),
// pesi successivi = bucket sempre piu' vecchi, contributo decrescente.
// Somma pesi = 2.7 → max drift cumulativo teorico = 100 × 2.7 = 270 ELO.
// Sotto il cap di 300 quindi raggiungibile solo con tutte vittorie o tutte sconfitte
// consecutive (raro): serie spettacolari di +200/-200 di scambio.
const MOMENTUM_WEIGHTS = [1.0, 0.7, 0.5, 0.3, 0.2];

// Cap assoluto del drift cumulativo (in valore assoluto). Evita derive estreme.
// Alzato da 300 a 500 perché con sessioni variabili (fino a 14 partite di fila),
// vogliamo che le grandi serie di vittorie/sconfitte abbiano un impatto visibile.
// Es. un admin con base 2400 puo' oscillare nel range 1900-2900 → variazione
// 1000 punti totale, swing notevoli che cambiano la classifica.
const MAX_CUMULATIVE_DRIFT = 500;

// Hash deterministico (FNV-1a) -> intero senza segno a 32 bit.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface AdminSeed {
  id: string;
}

// ELO BASE intrinseco di un admin: stabile per sempre, distribuito in tier
// realistici dai principianti totali ai top legendari. SEMPRE multiplo di 10
// (coerente con utenti reali +20/-10).
function baseElo(id: string): number {
  const h = hash(id);
  const tier = h % 100;
  const inner = (h >>> 8);

  // count = (max - min) / 10 + 1 → numero di valori possibili (multipli di 10)
  if (tier < 5)  return 2500 + (inner % 51) * 10; // 2500-3000 (5%)  top legendari
  if (tier < 18) return 2000 + (inner % 51) * 10; // 2000-2500 (13%) alti
  if (tier < 45) return 1500 + (inner % 51) * 10; // 1500-2000 (27%) medio-alti
  if (tier < 72) return 1000 + (inner % 51) * 10; // 1000-1500 (27%) medi
  if (tier < 87) return  600 + (inner % 41) * 10; // 600-1000  (15%) bassi
  if (tier < 95) return  300 + (inner % 31) * 10; // 300-600   (8%)  molto bassi
  return                100 + (inner % 21) * 10;  // 100-300   (5%)  principianti
}

// Frequenza di "gioco" personale dell'admin, in millisecondi.
// Es. un admin con hash(id+"freq")%7==0 gioca ogni 2 ore, un altro con
// hash...==6 gioca ogni 8 ore. Sempre uguale per lo stesso profilo.
function personalFrequencyMs(id: string): number {
  const range = FREQ_MAX_HOURS - FREQ_MIN_HOURS + 1; // 7
  const freqHours = FREQ_MIN_HOURS + (hash(`${id}#freq`) % range);
  return freqHours * HOUR_MS;
}

// Offset temporale personale dell'admin: spostamento di partenza del suo ciclo,
// in ms, all'interno del suo intervallo di frequenza. Garantisce che diversi
// admin NON aggiornino mai allo stesso istante.
// Granularita' a 5 minuti (sufficiente, evita micro-jitter).
function personalOffsetMs(id: string, freqMs: number): number {
  const slot = 5 * 60 * 1000; // 5 minuti
  const slots = Math.max(1, Math.floor(freqMs / slot));
  return (hash(`${id}#offset`) % slots) * slot;
}

// "Bucket personale" dell'admin al momento `now`. Incrementa di 1 ogni volta
// che e' passato un intervallo di frequenza personale. Profili diversi hanno
// scale temporali diverse e scatti in momenti diversi.
function personalBucket(id: string, now: number): number {
  const freqMs = personalFrequencyMs(id);
  const offsetMs = personalOffsetMs(id, freqMs);
  return Math.floor((now - EPOCH - offsetMs) / freqMs);
}

// 🎮 NUOVO MODELLO REALISTICO: ogni bucket personale rappresenta una "finestra"
// durante la quale l'admin POTREBBE giocare. La quantità di partite varia
// drasticamente, simulando comportamento umano reale:
//   - 30% pausa: l'admin in quella finestra non gioca (drift = 0)
//   - 30% 1 partita: fa solo una mano e va
//   - 18% 2-3 partite: sessione breve
//   - 12% 4-6 partite: sessione media
//   - 7%  7-9 partite: sessione intensa
//   - 3%  10-14 partite: maratona di gioco
//
// Risultato: classifica MOLTO più dinamica. Chi fa una maratona vincente
// scala +280 ELO in un colpo solo; chi prende una maratona di sconfitte può
// crollare di -140 ELO. ELO uguali tra admin praticamente azzerati.
function sessionGameCount(id: string, bucket: number): number {
  const h = hash(`${id}#count#${bucket}`);
  const r = h % 100;
  const inner = (h >>> 8);
  if (r < 30) return 0;                      // 30% pausa
  if (r < 60) return 1;                      // 30% 1 partita
  if (r < 78) return 2 + (inner % 2);        // 18% 2-3 partite
  if (r < 90) return 4 + (inner % 3);        // 12% 4-6 partite
  if (r < 97) return 7 + (inner % 3);        // 7%  7-9 partite
  return 10 + (inner % 5);                   // 3%  10-14 partite (maratona)
}

// Risultati di una singola sessione: per ogni partita un coin-flip
// deterministico (bit dell'hash outcome). Coerente con sistema utenti reali:
// +20 ELO per vittoria, -10 ELO per sconfitta.
function singleSessionResults(id: string, bucket: number): { wins: number; losses: number } {
  const games = sessionGameCount(id, bucket);
  if (games === 0) return { wins: 0, losses: 0 };
  const outcomeHash = hash(`${id}#out#${bucket}`);
  let wins = 0, losses = 0;
  for (let i = 0; i < games; i++) {
    // Coin flip deterministico per ogni partita della sessione
    if (((outcomeHash >>> (i % 32)) & 1) === 0) wins++;
    else losses++;
  }
  return { wins, losses };
}

// Drift = somma algebrica delle vittorie/sconfitte della sessione.
// +20 per vittoria, -10 per sconfitta. Compatibile col cap MAX_DRIFT.
function singleSessionDrift(id: string, bucket: number): number {
  const { wins, losses } = singleSessionResults(id, bucket);
  return wins * 20 + losses * -10;
}

// 🚀 Drift CUMULATIVO con momentum: somma pesata delle ultime N sessioni.
// Sessione piu' recente pesa di piu' (peso 1.0), sessioni vecchie pesano meno.
// Risultato: serie consecutive vinte/perse si AMPLIFICANO; serie miste si
// attenuano. Cap a ±MAX_CUMULATIVE_DRIFT per evitare derive estreme.
// Arrotondato a multipli di 10 per coerenza con il sistema utenti reali.
function cumulativeDrift(id: string, currentBucket: number): number {
  let sum = 0;
  for (let i = 0; i < MOMENTUM_WEIGHTS.length; i++) {
    const b = currentBucket - i;
    if (b < 0) break; // pre-EPOCH non ha senso
    sum += singleSessionDrift(id, b) * MOMENTUM_WEIGHTS[i];
  }
  // Cap a ±MAX_CUMULATIVE_DRIFT
  if (sum > MAX_CUMULATIVE_DRIFT) sum = MAX_CUMULATIVE_DRIFT;
  if (sum < -MAX_CUMULATIVE_DRIFT) sum = -MAX_CUMULATIVE_DRIFT;
  // Arrotonda al multiplo di 10 piu' vicino
  return Math.round(sum / 10) * 10;
}

// 🏆 Statistiche complete simulate per un admin profile.
// Tutti i numeri sono deterministici dall'id (stessa stat ovunque, sempre).
export interface AdminStats {
  elo: number;          // ELO corrente (base + cumulativeDrift)
  baseElo: number;      // ELO base intrinseco
  totalWins: number;    // Vittorie LIVE (cumulato da tutti i bucket passati)
  totalLosses: number;  // Sconfitte LIVE
  totalDraws: number;   // Pareggi (sempre 0 nel modello drift)
  top1Trophies: number; // Volte che e' stato #1 in classifica (simulate)
  tournamentsWon: number; // Tornei vinti (simulati: proporzionali al baseElo)
}

// ⚠️ DEPRECATA con il nuovo modello sessioni multiple: ora abbiamo accesso
// diretto a wins/losses tramite `singleSessionResults(id, bucket)`, quindi
// non serve decomporre il drift "alla cieca". Manteniamo la funzione per
// retrocompatibilità ma il chiamante (computeAdminLifetimeStats) usa la
// versione nuova `singleSessionResults`.
function decomposeDrift(d: number): { wins: number; losses: number } {
  if (d === 0) return { wins: 0, losses: 0 };
  if (d > 0) {
    const wins = Math.ceil(d / 20);
    const losses = (20 * wins - d) / 10;
    return { wins, losses };
  }
  return { wins: 0, losses: Math.abs(d) / 10 };
}

// Conta TUTTE le vittorie/sconfitte cumulate dall'EPOCH (1 gen 2026) al
// bucket personale corrente. Ogni bucket = una "sessione di gioco" che
// produce un drift; il drift si scompone in V/S atomiche.
// Risultato LIVE: quando un nuovo bucket personale scatta, le V/S aumentano
// senza bisogno di pre-calcolo o storage.
function computeAdminLifetimeStats(id: string): { wins: number; losses: number } {
  const now = Date.now();
  const currentBucket = personalBucket(id, now);
  let totalWins = 0;
  let totalLosses = 0;
  for (let b = 0; b <= currentBucket; b++) {
    // ⚡ Usa singleSessionResults direttamente: coerente con il nuovo modello
    //    di sessioni a lunghezza variabile (drift = wins*20 - losses*10).
    const { wins, losses } = singleSessionResults(id, b);
    totalWins += wins;
    totalLosses += losses;
  }
  return { wins: totalWins, losses: totalLosses };
}

// 🏆 Trofei TOP 1 GIORNALIERI per admin: snapshot a mezzanotte UTC di
// ogni giorno passato dall'EPOCH. Per ogni giorno, se l'ELO simulato di
// questo admin a mezzanotte era il piu' alto fra TUTTI gli admin → +1 trofeo.
// Coerente col sistema utenti reali (award_daily_top1_if_needed lato DB).
//
// Realistico: un top admin (base 2900) vincera' la maggioranza dei giorni,
// un basso (base 200) mai. Calcolato lazy al click sul dialog profilo.
const DAY_MS = 24 * 60 * 60 * 1000;

function computeAdminLifetimeTrophies(id: string, allAdmins: AdminSeed[]): number {
  const now = Date.now();
  // Mezzanotte UTC di OGGI (escluso, conta solo i giorni PASSATI)
  const today = new Date();
  const midnightTodayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  // Mezzanotte UTC del giorno della EPOCH (incluso se >= EPOCH)
  const firstDay = new Date(EPOCH);
  let dayMidnight = Date.UTC(
    firstDay.getUTCFullYear(),
    firstDay.getUTCMonth(),
    firstDay.getUTCDate() + 1 // primo giorno COMPLETO dopo EPOCH
  );

  const myBase = baseElo(id);
  let trophies = 0;

  while (dayMidnight < midnightTodayUTC) {
    // ELO di QUESTO admin alla mezzanotte di quel giorno
    if (dayMidnight >= EPOCH) {
      const myBucket = personalBucket(id, dayMidnight);
      const myElo = Math.max(100, myBase + cumulativeDrift(id, myBucket));

      // Confronta con ogni altro admin a quello stesso istante
      let amTop = true;
      for (const other of allAdmins) {
        if (other.id === id) continue;
        const otherBucket = personalBucket(other.id, dayMidnight);
        if (otherBucket < 0) continue;
        const otherElo = Math.max(100, baseElo(other.id) + cumulativeDrift(other.id, otherBucket));
        if (otherElo > myElo) {
          amTop = false;
          break;
        }
      }
      if (amTop) trophies++;
    }
    dayMidnight += DAY_MS;
  }

  return trophies;
}

// `allAdmins` opzionale: se omesso, trofei = 0 (no info per calcolare).
// Quando passato, calcola i trofei LIVE come descritto sopra.
export function computeAdminStats(id: string, allAdmins?: AdminSeed[]): AdminStats {
  const base = baseElo(id);
  const now = Date.now();
  const bucket = personalBucket(id, now);
  const elo = Math.max(100, base + cumulativeDrift(id, bucket));

  // ⚡ V/S LIVE: cumulate da tutti i bucket personali passati. Aumentano
  // automaticamente quando scatta un nuovo bucket (ogni 2-8h secondo profilo).
  const { wins: totalWins, losses: totalLosses } = computeAdminLifetimeStats(id);

  // Pareggi: il modello drift non li distingue (drift 0 = sessione idle).
  const totalDraws = 0;

  // 🏆 Trofei TOP 1 LIVE: simulati da quante volte e' stato #1 in classifica.
  const top1Trophies = allAdmins ? computeAdminLifetimeTrophies(id, allAdmins) : 0;

  // 🥇 Tornei vinti: simulati in modo deterministico in base al baseElo.
  //    Formula: tier_elo / 500 + hash variance. Admin top legendari (2500+)
  //    arrivano a 5-7 tornei vinti, medi 1-2, bassi 0.
  const tournamentBase = Math.max(0, Math.floor((base - 1000) / 400));
  const tournamentVariance = hash(`${id}#tourn`) % 3; // 0..2
  const tournamentsWon = Math.max(0, tournamentBase + tournamentVariance - 1);

  return { elo, baseElo: base, totalWins, totalLosses, totalDraws, top1Trophies, tournamentsWon };
}

// Mappa id -> ELO simulato corrente. Ogni admin aggiorna al suo ritmo:
// alcuni ogni 2 ore, altri ogni 8, ognuno con offset diverso. Il drift
// cumulativo amplifica le serie consecutive: un admin che ha avuto 3 buone
// sessioni di fila puo' salire di +130 ELO, uno con 4 brutte sessioni puo'
// crollare di -130 ELO. La classifica si muove in modo organico e meritocratico.
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  if (admins.length === 0) return result;

  const now = Date.now();

  for (const a of admins) {
    const bucket = personalBucket(a.id, now);
    const elo = baseElo(a.id) + cumulativeDrift(a.id, bucket);
    result.set(a.id, Math.max(100, elo));
  }

  return result;
}
