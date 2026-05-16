// Simulazione ELO "reale" dei profili admin.
// Ogni profilo parte da un ELO casuale ma fisso e ogni 3 ore "gioca" una
// partita: vince (+20) o perde (-10), come un giocatore vero. I punteggi
// risultano sparsi e diversi (es. 450, 930, 1540, 2010, 2870...).
// Il calcolo è deterministico in base all'orario, quindi lo stesso valore
// compare identico in classifica e durante le partite.

const THREE_HOURS = 3 * 60 * 60 * 1000;
// Epoca fissa di riferimento per contare i periodi da 3 ore.
const EPOCH = Date.UTC(2026, 0, 1);
const FLOOR = 300;
const CEIL = 2950;

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

// ELO simulato corrente di un singolo profilo admin.
function eloForId(id: string): number {
  // ELO di partenza casuale ma stabile, multiplo di 10.
  const steps = (CEIL - FLOOR) / 10;
  let elo = FLOOR + (hash(id) % (steps + 1)) * 10;

  const buckets = Math.max(0, Math.floor((Date.now() - EPOCH) / THREE_HOURS));
  for (let k = 1; k <= buckets; k++) {
    // 1 partita ogni 3 ore: 1 vittoria su 3 (+20), altrimenti sconfitta (-10).
    const delta = hash(`${id}#${k}`) % 3 === 0 ? 20 : -10;
    let next = elo + delta;
    // Rimbalza ai bordi per restare in un intervallo plausibile.
    if (next > CEIL || next < FLOOR) next = elo - delta;
    elo = next;
  }
  return elo;
}

// Mappa id -> ELO simulato corrente per i profili admin passati.
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const a of admins) result.set(a.id, eloForId(a.id));
  return result;
}
