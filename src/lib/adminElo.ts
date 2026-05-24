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

  const bucket = Math.floor((Date.now() - EPOCH) / THREE_HOURS);

  // 1. Graduatoria di n ELO distinti, dal piu' alto al piu' basso, con
  //    distacchi variabili che CAMBIANO OGNI 3 ORE (per dare l'impressione
  //    che gli ELO oscillino come se i giocatori facessero partite).
  //    Alle prime posizioni diamo un BONUS di peso che decade esponenzialmente,
  //    cosi' il #1 e' molto sopra al #2 (es. 50-60 punti), poi i gap si stringono.
  const pool: number[] = [TOP_ELO];
  if (n > 1) {
    const weights: number[] = [];
    for (let r = 0; r < n - 1; r++) {
      const positionBonus = Math.max(0, Math.floor(20 * Math.exp(-r / 3)));
      // 1 base + bonus posizione + 0-9 random che varia per bucket (cosi'
      // i gap, e quindi i numeri della classifica, cambiano ogni 3 ore)
      weights.push(1 + positionBonus + (hash(`gap-${r}-${bucket}`) % 10));
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

  // 2. Ordina i profili. Prima era 'base stabile + piccolo wobble' → i top
  //    restavano sempre top. Ora la chiave dipende interamente da hash(id, bucket)
  //    → ogni 3 ore i profili si rimescolano davvero. Per stabilita' visiva
  //    teniamo un piccolo "anchor" (10% peso) che fa si' che gli stessi profili
  //    tendano a stare in zone simili — ma con scambi multi-posizione visibili.
  const ranked = admins
    .map((a) => {
      const anchor = (hash(a.id) % 100000); // peso ridotto, era 1000000
      const rotation = hash(`${a.id}#bucket#${bucket}`) % 900000; // peso 9x
      return { id: a.id, key: anchor + rotation };
    })
    .sort((x, y) => (x.key !== y.key ? x.key - y.key : x.id < y.id ? -1 : 1));

  // 3. Ogni profilo riceve un ELO distinto dalla graduatoria + un drift ±4
  //    personale che cambia ogni bucket (simula partite individuali).
  //    Con gap minimo del pool=10 e drift max ±4, gli ELO restano DISTINTI:
  //    slot i [pool[i]-4, pool[i]+4], slot i+1 [pool[i+1]-4, pool[i+1]+4],
  //    differenza minima = 10 - 8 = 2.
  ranked.forEach((p, rank) => {
    const drift = (hash(`${p.id}#drift#${bucket}`) % 9) - 4; // ±4
    result.set(p.id, pool[rank] + drift);
  });

  return result;
}
