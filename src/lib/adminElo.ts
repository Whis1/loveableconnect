// Simulazione ELO "reale" dei profili admin.
// Ogni profilo ha una "bravura" (skill) fissa, distribuita a campana:
// pochi profili fortissimi, pochi scarsi, la maggioranza nella media.
// Ogni 3 ore "gioca" una partita e il suo ELO oscilla intorno alla propria
// skill (vince +20, perde -10), in modo realistico. Il calcolo è
// deterministico in base all'orario: stesso valore in classifica e in partita.

const THREE_HOURS = 3 * 60 * 60 * 1000;
// Epoca fissa di riferimento per contare i periodi da 3 ore.
const EPOCH = Date.UTC(2026, 0, 1);

// Hash deterministico (FNV-1a) -> intero senza segno a 32 bit.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Bravura fissa del profilo: distribuzione a campana (~700..2800, centro
// ~1750), multipla di 10. Pochi profili forti, pochi deboli, molti medi.
function skillOf(id: string): number {
  const a = hash(id + "|s1") % 1000;
  const b = hash(id + "|s2") % 1000;
  const c = hash(id + "|s3") % 1000;
  const avg = (a + b + c) / 3;
  return Math.round((700 + avg * 2.1) / 10) * 10;
}

interface AdminSeed {
  id: string;
}

// Mappa id -> ELO simulato corrente per i profili admin passati.
export function computeAdminElos(admins: AdminSeed[]): Map<string, number> {
  const result = new Map<string, number>();
  const buckets = Math.max(0, Math.floor((Date.now() - EPOCH) / THREE_HOURS));

  for (const a of admins) {
    const skill = skillOf(a.id);
    let elo = skill;
    for (let k = 1; k <= buckets; k++) {
      // Più sei sopra la tua skill, meno è probabile vincere (e viceversa):
      // l'ELO oscilla in modo realistico intorno al livello del profilo.
      let winChance = 33 - (elo - skill) / 12;
      if (winChance < 3) winChance = 3;
      if (winChance > 75) winChance = 75;
      const roll = hash(`${a.id}#${k}`) % 100;
      elo += roll < winChance ? 20 : -10;
    }
    result.set(a.id, Math.round(elo / 10) * 10);
  }
  return result;
}
