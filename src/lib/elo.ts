// Calcolo ELO condiviso: garantisce lo stesso valore in classifica,
// ricerca avversario e partite (Tris e Dama).

interface EloProfile {
  id: string;
  game_elo?: number | null;
  is_admin_profile?: boolean | null;
}

// Hash deterministico (FNV-1a) di una stringa -> intero non negativo.
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// ELO mostrato per un profilo.
// Profili admin: ELO base + un'oscillazione decimale unica per profilo che
// cambia ogni 3 ore (così la classifica "vive" e non ci sono mai pareggi).
// Utenti reali: il loro ELO reale e invariato.
export function getDisplayElo(profile: EloProfile): number {
  const base = profile.game_elo ?? 1200;
  if (!profile.is_admin_profile) return base;
  const bucket = Math.floor(Date.now() / (3 * 60 * 60 * 1000));
  const drift = (hashString(`${profile.id}:${bucket}`) % 3001) / 100 - 15;
  return base + drift;
}

// Formatta un ELO con due decimali.
export function formatElo(elo: number): string {
  return elo.toFixed(2);
}
