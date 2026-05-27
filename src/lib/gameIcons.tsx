import React from "react";

/**
 * 🎮 Icone custom per il sistema di gioco (Vittorie / Sconfitte).
 *
 * Pensate per il contesto sfida/duello (Tris/Dama), niente emoji generiche.
 * Stile coerente: SVG inline con currentColor → ereditano il colore dal
 * parent via Tailwind (text-emerald-500, text-rose-500, ecc.).
 *
 * Per il trofeo "Campione del Giorno" si usa l'icona `Trophy` di lucide-react
 * (già coerente col tema oro/ambra).
 */

// 🏆 Vittoria: stella piena con scintille intorno → celebrazione, glory shot
export const VictoryIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    stroke="none"
    aria-hidden
  >
    <path d="M12 2.5l2.6 5.76 6.3.65-4.7 4.25 1.3 6.18L12 16.27l-5.5 3.07 1.3-6.18L3.1 8.91l6.3-.65L12 2.5z" />
    <circle cx="19.5" cy="4.5" r="1.1" opacity="0.85" />
    <circle cx="21.5" cy="7.5" r="0.7" opacity="0.6" />
    <circle cx="4.5" cy="20" r="0.7" opacity="0.55" />
  </svg>
);

// ❌ Sconfitta: X dentro un cerchio tratteggiato → target mancato, fail
export const DefeatIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="9.2" strokeDasharray="3 2.5" opacity="0.75" />
    <line x1="8" y1="8" x2="16" y2="16" />
    <line x1="16" y1="8" x2="8" y2="16" />
  </svg>
);
