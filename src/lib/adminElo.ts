// Simulazione ELO dei profili admin: ogni admin ha un ELO "intrinseco"
// persistente (deterministico dall'id) che oscilla ogni 3 ore di ±60 punti,
// come se avesse giocato partite (vinte/perse). NESSUNA forzatura di slot
// in classifica: la posizione finale dipende SOLO dal valore numerico ELO,
// quindi un utente reale che supera un admin in punteggio gli passa davanti.
//
// Distribuzione realistica dei "talenti" admin (percentuali ispirate ai
// rating chess online):
//   5%  top legendari   (2500-3000)
//   15% alti            (2000-2500)
//   30% medio-alti      (1500-2000)
//   30% medi            (1000-1500)
//   15% bassi           (600-1000)
//   5%  molto bassi     (400-600)
// → la classifica mostra un mix vario di livelli, alcuni admin sono battibili
//   anche da utenti free, altri restano vette difficili da scalare.

const THREE_HOURS = 3 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2026, 0, 1);

// Drift massimo per bucket di 3 ore: ±60 ELO. Coerente con il sistema
// utenti reali (+20 ELO per vittoria, -10 ELO per sconfitta):
//   +60 = 3 vittorie consecutive  (3 × +20)
//   -60 = 6 sconfitte consecutive (6 × -10)
//   Realistico per 3 ore di gioco "simulato".
const MAX_DRIFT = 60;

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
// realistici. SEMPRE multiplo di 10 (coerente con il sistema utenti reali
// che guadagnano +20 / perdono -10 ad ogni partita).
function baseElo(id: string): number {
  const h = hash(id);
  const tier = h % 100;     // 0-99 → determina la fascia
  const inner = (h >>> 8);  // bit alti → posizione DENTRO la fascia

  // count = (max - min) / 10 + 1 → numero di valori possibili (multipli di 10)
  if (tier < 5)  return 2500 + (inner % 51) * 10; // 2500-3000 (5%)
  if (tier < 20) return 2000 + (inner % 51) * 10; // 2000-2500 (15%)
  if (tier < 50) return 1500 + (inner % 51) * 10; // 1500-2000 (30%)
  if (tier < 80) return 1000 + (inner % 51) * 10; // 1000-1500 (30%)
  if (tier < 95) return  600 + (inner % 41) * 10; // 600-1000  (15%)
  return                400 + (inner % 21) * 10;  // 400-600   (5%)
}

// Drift corrente per bucket di 3 ore: ±MAX_DRIFT ELO in STEP DI 10.
// Es. -60, -50, -40, ..., 0, ..., +50, +60 → 13 valori possibili.
// Coerente con il sistema utenti reali (+20 vittoria / -10 sconfitta).
function currentDrift(id: string, bucket: number): number {
  const steps = MAX_DRIFT / 10; // 6
  return ((hash(`${id}#bucket#${bucket}`) % (2 * steps + 1)) - steps) * 10;
}

// Mappa id -> ELO simulato corrente per i profili admin passati.
// L'ordinamento finale nella classifica (in EloLeaderboard) viene poi fatto
// SEMPLICEMENTE per valore ELO desc, quindi admin + utenti reali competono
// nello stesso campo: chi ha l'ELO piu' alto sta sopra, punto.
// Tutti gli ELO sono multipli di 10 (base*10 + drift*10).
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  if (admins.length === 0) return result;

  const bucket = Math.floor((Date.now() - EPOCH) / THREE_HOURS);

  for (const a of admins) {
    const elo = baseElo(a.id) + currentDrift(a.id, bucket);
    // Floor a 100 per evitare valori assurdi negli edge case
    result.set(a.id, Math.max(100, elo));
  }

  return result;
}
