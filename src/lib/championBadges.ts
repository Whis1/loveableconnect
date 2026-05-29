// 🏆 Sistema "Titoli di Campione" basato sulle serie consecutive da #1 in classifica.
//
// Tre titoli:
//   1) Campione           → sei stato #1 almeno una volta (badge binario).
//   2) Campione della Settimana xN → N = numero di settimane INTERE (7 giorni
//                            consecutivi) passate da #1. Una giornata fuori dal
//                            #1 interrompe la serie in corso.
//   3) Campione del Mese xN → N = numero di mesi INTERI (30 giorni consecutivi)
//                            passati da #1.
//
// Conteggio: per ogni "run" (sequenza di giorni consecutivi da #1) di lunghezza L,
//   weeks  += floor(L / 7)
//   months += floor(L / 30)
// I run sono indipendenti: una serie di 30 giorni vale Settimana x4 + Mese x1.

export interface ChampionBadges {
  everChampion: boolean; // mai stato #1
  weeks: number;         // settimane intere consecutive da #1 (cumulate)
  months: number;        // mesi interi consecutivi da #1 (cumulati)
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcola i titoli dato un elenco di "numeri di giorno" (interi) in cui il
 * profilo era #1 in classifica. Un numero di giorno = Math.floor(midnightUTC/DAY_MS).
 */
export function computeChampionBadges(dayNumbers: number[]): ChampionBadges {
  if (!dayNumbers || dayNumbers.length === 0) {
    return { everChampion: false, weeks: 0, months: 0 };
  }

  // dedup + ordina crescente
  const sorted = Array.from(new Set(dayNumbers)).sort((a, b) => a - b);

  let weeks = 0;
  let months = 0;

  let runStart = sorted[0];
  let prev = sorted[0];

  const closeRun = (len: number) => {
    weeks += Math.floor(len / 7);
    months += Math.floor(len / 30);
  };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      closeRun(prev - runStart + 1);
      runStart = sorted[i];
      prev = sorted[i];
    }
  }
  closeRun(prev - runStart + 1);

  return { everChampion: true, weeks, months };
}

/** Converte una data 'YYYY-MM-DD' nel numero di giorno (UTC). */
export function dateStringToDayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}
