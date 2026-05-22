// Simulazione ELO dei profili admin.
// Ogni profilo riceve un ELO da una "graduatoria" di valori tutti distinti
// (numeri pari, con distacchi variabili e realistici). Ogni 3 ore i profili
// salgono/scendono di qualche posizione, come se avessero giocato.
// Garanzie: punteggi sempre diversi (mai pareggi), realistici, e deterministici
// — quindi identici in classifica e durante le partite.

const THREE_HOURS = 3 * 60 * 60 * 1000;
// Epoca fissa di riferimento per contare i periodi da 3 ore.
const EPOCH = Date.UTC(2026, 0, 1);
// Range della classifica simulata.
// Il TOP_ELO degli admin e' fissato a 3050: vogliamo che 3200 resti una
// "vetta legendaria" che nemmeno i top profili admin raggiungono, come se
// stessero ancora combattendo partite per arrivarci. 3050 e' comunque
// impressionante (oltre la soglia 3000 dei top giocatori chess online).
// Il bottom a 430 rappresenta un principiante che ha perso tanto.
const TOP_ELO = 3050;
const BOTTOM_ELO = 430;

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

// Mappa id -> ELO simulato corrente per i profili admin passati.
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  const n = admins.length;
  if (n === 0) return result;

  // 1. Graduatoria di n ELO distinti, dal piu' alto al piu' basso, con
  //    distacchi variabili. Importante: alle prime posizioni diamo un
  //    BONUS di peso che decade esponenzialmente, cosi' il #1 e' molto
  //    sopra al #2 (es. 50-60 punti), poi i gap si stringono. E' come
  //    succede nelle classifiche reali (es. Magnus Carlsen ELO 2830 vs
  //    #2 a 2786 = 44 punti di differenza).
  const pool: number[] = [TOP_ELO];
  if (n > 1) {
    const weights: number[] = [];
    for (let r = 0; r < n - 1; r++) {
      // Bonus decrescente per le prime posizioni: r=0 prende +20, r=1 +14,
      // r=2 +10, r=3 +7, r=4 +5... fino a 0 dopo la decima posizione.
      const positionBonus = Math.max(0, Math.floor(20 * Math.exp(-r / 3)));
      // 1 base + bonus posizione + 0-9 random (per non avere gap identici)
      weights.push(1 + positionBonus + (hash(`gap-${r}`) % 10));
    }
    const weightSum = weights.reduce((s, w) => s + w, 0);
    const span = TOP_ELO - BOTTOM_ELO;
    let elo = TOP_ELO;
    for (let r = 0; r < n - 1; r++) {
      let gap = Math.round(((weights[r] / weightSum) * span) / 10) * 10;
      if (gap < 10) gap = 10; // distacco minimo: garantisce valori sempre distinti
      elo -= gap;
      pool.push(elo);
    }
  }

  // 2. Ordina i profili: posizione di base stabile + un'oscillazione che cambia
  //    ogni 3 ore (movimento di poche posizioni, come "partite giocate").
  const bucket = Math.floor((Date.now() - EPOCH) / THREE_HOURS);
  const amp = Math.max(1, Math.floor(200000 / n));
  const ranked = admins
    .map((a) => {
      const base = hash(a.id) % 1000000;
      const wobble = (hash(`${a.id}#${bucket}`) % (2 * amp + 1)) - amp;
      return { id: a.id, key: base + wobble };
    })
    .sort((x, y) => (x.key !== y.key ? x.key - y.key : x.id < y.id ? -1 : 1));

  // 3. Ogni profilo riceve un ELO distinto dalla graduatoria, in base alla posizione.
  ranked.forEach((p, rank) => {
    result.set(p.id, pool[rank]);
  });

  return result;
}
