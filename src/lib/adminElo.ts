// Simulazione ELO dei profili admin.
// Ogni 3 ore alcuni profili "giocano": coppie adiacenti in classifica si
// scambiano di posizione (chi sale +20, chi scende -20). I punteggi restano
// sempre numeri pari, tutti diversi tra loro, e identici tra classifica e
// partite (il calcolo è deterministico in base all'orario).

const THREE_HOURS = 3 * 60 * 60 * 1000;
// Epoca fissa di riferimento per contare i periodi da 3 ore.
const EPOCH = Date.UTC(2026, 0, 1);
const TOP_ELO = 2800;
const STEP = 20;

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
  game_elo?: number | null;
}

// Restituisce una mappa id -> ELO simulato corrente per i profili admin.
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  const n = admins.length;
  if (n === 0) return result;

  // Ordine iniziale: dal game_elo più alto, con l'id come spareggio stabile.
  const ordered = [...admins].sort((a, b) => {
    const d = (b.game_elo ?? 1200) - (a.game_elo ?? 1200);
    return d !== 0 ? d : a.id < b.id ? -1 : 1;
  });

  // rankToIndex[rango] = posizione del profilo in `ordered`.
  const rankToIndex = ordered.map((_, i) => i);

  const buckets = Math.max(0, Math.floor((Date.now() - EPOCH) / THREE_HOURS));
  if (n >= 2) {
    for (let b = 1; b <= buckets; b++) {
      const swapCount = 3 + (hash(`c${b}`) % 4); // 3..6 scambi ogni 3 ore
      for (let s = 0; s < swapCount; s++) {
        const pos = hash(`b${b}.${s}`) % (n - 1);
        const tmp = rankToIndex[pos];
        rankToIndex[pos] = rankToIndex[pos + 1];
        rankToIndex[pos + 1] = tmp;
      }
    }
  }

  for (let rank = 0; rank < n; rank++) {
    result.set(ordered[rankToIndex[rank]].id, TOP_ELO - rank * STEP);
  }
  return result;
}
