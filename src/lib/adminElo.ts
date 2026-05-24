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

// Drift massimo per bucket di 3 ore: ±60 ELO. Equivalente a 3-6 partite
// giocate (in cui una vittoria/sconfitta vale tipicamente 10-20 ELO).
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
// realistici. Cambia solo se cambia l'id (mai).
function baseElo(id: string): number {
  const h = hash(id);
  const tier = h % 100;     // 0-99 → determina la fascia
  const inner = (h >>> 8);  // bit alti → posizione DENTRO la fascia

  if (tier < 5)  return 2500 + (inner % 501); // 2500-3000 (5%)
  if (tier < 20) return 2000 + (inner % 501); // 2000-2500 (15%)
  if (tier < 50) return 1500 + (inner % 501); // 1500-2000 (30%)
  if (tier < 80) return 1000 + (inner % 501); // 1000-1500 (30%)
  if (tier < 95) return  600 + (inner % 401); // 600-1000  (15%)
  return                400 + (inner % 201);  // 400-600   (5%)
}

// Drift corrente per bucket di 3 ore: ±MAX_DRIFT ELO, deterministico da
// hash(id, bucket). Simula "quanto ha giocato bene/male nelle ultime 3 ore".
function currentDrift(id: string, bucket: number): number {
  return (hash(`${id}#bucket#${bucket}`) % (2 * MAX_DRIFT + 1)) - MAX_DRIFT;
}

// Mappa id -> ELO simulato corrente per i profili admin passati.
// L'ordinamento finale nella classifica (in EloLeaderboard) viene poi fatto
// SEMPLICEMENTE per valore ELO desc, quindi admin + utenti reali competono
// nello stesso campo: chi ha l'ELO piu' alto sta sopra, punto.
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
