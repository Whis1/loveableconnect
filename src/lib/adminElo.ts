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
// Spostata al 24 maggio 2026, 18:00 UTC → da quel momento in poi tutti gli
// admin partono da 0 V/S/T e accumulano in tempo reale al passare dei
// bucket personali. Per "azzerare" di nuovo basta aggiornare questa data.
const EPOCH = Date.UTC(2026, 4, 24, 18, 0);

// Drift massimo per ogni singola "sessione di gioco" (un bucket personale):
//   +60 = 3 vittorie consecutive  (3 × +20)
//   -60 = 6 sconfitte consecutive (6 × -10)
const MAX_DRIFT = 60;

// Range di frequenza personale di "gioco" per admin:
//   FREQ_MIN_HOURS = chi gioca tanto (aggiornamento ogni 2 ore)
//   FREQ_MAX_HOURS = chi gioca poco  (aggiornamento ogni 8 ore)
// Distribuiti uniformemente sui profili admin via hash(id+"freq").
const FREQ_MIN_HOURS = 2;
const FREQ_MAX_HOURS = 8;

// Pesi del momentum cumulativo: peso[0] = bucket appena passato (piu' rilevante),
// pesi successivi = bucket sempre piu' vecchi, contributo decrescente.
// Somma pesi = 2.7 → max drift cumulativo teorico = 60 × 2.7 = 162 ELO.
// Sotto il cap di 200 quindi raggiungibile solo con tutte vittorie o tutte sconfitte
// consecutive (raro), che e' esattamente cio' che vogliamo: serie spettacolari.
const MOMENTUM_WEIGHTS = [1.0, 0.7, 0.5, 0.3, 0.2];

// Cap assoluto del drift cumulativo (in valore assoluto). Evita derive estreme.
// Es. un admin con base 2400 puo' oscillare nel range 2200-2600 → variazione
// 400 punti totale, sufficientemente ampia per scambi di posizione reali ma
// non assurda (un top non sprofonda mai al penultimo posto).
const MAX_CUMULATIVE_DRIFT = 200;

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

// Drift di una singola sessione (un bucket personale): ±MAX_DRIFT ELO in
// step di 10, deterministico per (id, bucket). Rappresenta l'esito di
// "quella" sessione di gioco simulata.
function singleSessionDrift(id: string, bucket: number): number {
  const steps = MAX_DRIFT / 10; // 6
  return ((hash(`${id}#bucket#${bucket}`) % (2 * steps + 1)) - steps) * 10;
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
}

// 🎯 Decompone un drift D (multiplo di 10, range ±60) in vittorie/sconfitte
// atomiche secondo il sistema +20 vittoria / -10 sconfitta.
// Cerca il minimo numero di partite (V+S) per ottenere esattamente D.
//   D > 0: V = ceil(D/20),  S = (20V - D) / 10
//   D < 0: V = 0,           S = |D| / 10
//   D = 0: nessuna partita giocata in quella sessione (idle)
// Esempi:
//   D=+60 → 3V/0S    D=+50 → 3V/1S    D=+40 → 2V/0S    D=+30 → 2V/1S
//   D=+20 → 1V/0S    D=+10 → 1V/1S    D=0   → 0V/0S
//   D=-10 → 0V/1S    D=-20 → 0V/2S    ... D=-60 → 0V/6S
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
    const drift = singleSessionDrift(id, b);
    const { wins, losses } = decomposeDrift(drift);
    totalWins += wins;
    totalLosses += losses;
  }
  return { wins: totalWins, losses: totalLosses };
}

// 🏆 Trofei TOP 1 LIVE per admin: per ogni bucket personale di QUESTO
// admin, controlliamo se in quel momento il suo ELO simulato era il piu'
// alto tra TUTTI gli admin. Se si', conta come 1 trofeo. Realistico:
// un top admin (base 2900) sara' stato #1 in molti bucket, un basso
// quasi mai.
//
// allAdmins: lista TUTTI gli admin del sistema (passare admins.length puo'
// essere costoso, ma il calcolo avviene solo lazy al click sul dialog).
function computeAdminLifetimeTrophies(id: string, allAdmins: AdminSeed[]): number {
  const now = Date.now();
  const myCurrentBucket = personalBucket(id, now);
  if (myCurrentBucket < 0) return 0;

  const myFreq = personalFrequencyMs(id);
  const myOffset = personalOffsetMs(id, myFreq);
  const myBase = baseElo(id);

  let trophies = 0;
  for (let b = 0; b <= myCurrentBucket; b++) {
    // Timestamp esatto in cui scatta il bucket b di QUESTO admin
    const t = EPOCH + myOffset + b * myFreq;

    // ELO di QUESTO admin a quel momento
    const myElo = Math.max(100, myBase + cumulativeDrift(id, b));

    // Confronta con ogni altro admin (al suo bucket personale a quell'istante)
    let amTop = true;
    for (const other of allAdmins) {
      if (other.id === id) continue;
      const otherBucket = personalBucket(other.id, t);
      if (otherBucket < 0) continue; // pre-EPOCH per quell'admin
      const otherElo = Math.max(100, baseElo(other.id) + cumulativeDrift(other.id, otherBucket));
      if (otherElo > myElo) {
        amTop = false;
        break;
      }
    }
    if (amTop) trophies++;
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

  return { elo, baseElo: base, totalWins, totalLosses, totalDraws, top1Trophies };
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
