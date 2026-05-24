// Simulazione ELO dei profili admin con AGGIORNAMENTI ASINCRONI PER PROFILO.
//
// 🎯 SISTEMA REALISTICO: ogni admin ha
//   1) un ELO BASE intrinseco persistente (mai cambia)
//   2) una FREQUENZA di aggiornamento personale (2-8 ore — chi gioca tanto,
//      chi solo qualche volta al giorno)
//   3) un OFFSET temporale personale (sfasamento iniziale rispetto agli altri,
//      cosi' nessuno aggiorna nello stesso istante)
//   4) un DRIFT ±60 ELO applicato AD OGNI SUO bucket personale
//
// Risultato: alle 14:23 magari Guerriero ha appena "giocato" e ha guadagnato
// +30, Sognatore non gioca da 6 ore (ultimo aggiornamento alle 8:17), Topazio
// gioca ogni 2 ore (prossimo aggiornamento alle 15:09). La classifica si
// muove in modo organico, non a scatti sincronizzati come prima.
//
// NESSUNA forzatura di slot: la posizione finale dipende SOLO dal valore
// numerico ELO. Un utente reale che supera un admin gli passa davanti.
//
// Distribuzione realistica dei "talenti" admin (ispirata ai rating chess online):
//   5%  top legendari   (2500-3000)
//   15% alti            (2000-2500)
//   30% medio-alti      (1500-2000)
//   30% medi            (1000-1500)
//   15% bassi           (600-1000)
//   5%  molto bassi     (400-600)

const HOUR_MS = 60 * 60 * 1000;
const EPOCH = Date.UTC(2026, 0, 1);

// Drift massimo per ogni "sessione di gioco simulata":
//   +60 = 3 vittorie consecutive  (3 × +20)
//   -60 = 6 sconfitte consecutive (6 × -10)
const MAX_DRIFT = 60;

// Range di frequenza personale di "gioco" per admin:
//   FREQ_MIN_HOURS = chi gioca tanto (aggiornamento ogni 2 ore)
//   FREQ_MAX_HOURS = chi gioca poco  (aggiornamento ogni 8 ore)
// Distribuiti uniformemente sui profili admin via hash(id+"freq").
const FREQ_MIN_HOURS = 2;
const FREQ_MAX_HOURS = 8;

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
// realistici. SEMPRE multiplo di 10 (coerente con utenti reali +20/-10).
function baseElo(id: string): number {
  const h = hash(id);
  const tier = h % 100;
  const inner = (h >>> 8);

  if (tier < 5)  return 2500 + (inner % 51) * 10; // 2500-3000 (5%)
  if (tier < 20) return 2000 + (inner % 51) * 10; // 2000-2500 (15%)
  if (tier < 50) return 1500 + (inner % 51) * 10; // 1500-2000 (30%)
  if (tier < 80) return 1000 + (inner % 51) * 10; // 1000-1500 (30%)
  if (tier < 95) return  600 + (inner % 41) * 10; // 600-1000  (15%)
  return                400 + (inner % 21) * 10;  // 400-600   (5%)
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

// Drift corrente: ±MAX_DRIFT ELO in step di 10, deterministico per
// (id, bucket_personale_corrente). Quando il bucket avanza, il drift cambia
// → l'admin "ha giocato" e il suo ELO si aggiorna.
function currentDrift(id: string, bucket: number): number {
  const steps = MAX_DRIFT / 10; // 6
  return ((hash(`${id}#bucket#${bucket}`) % (2 * steps + 1)) - steps) * 10;
}

// Mappa id -> ELO simulato corrente. Ogni admin aggiorna al suo ritmo:
// alcuni ogni 2 ore, altri ogni 8, ognuno con offset diverso. La classifica
// si muove in modo organico, non a scatti sincronizzati.
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  if (admins.length === 0) return result;

  const now = Date.now();

  for (const a of admins) {
    const bucket = personalBucket(a.id, now);
    const elo = baseElo(a.id) + currentDrift(a.id, bucket);
    result.set(a.id, Math.max(100, elo));
  }

  return result;
}
