import React from "react";

// 🎖️ Icone SVG personalizzate per i titoli di Campione.
// Niente emoji: gradient + dettagli per un look premium. Escalation visiva:
//   Campione (trofeo dorato) → Settimana (corona) → Mese (corona con gemma e raggi).
// La prop `active` accende il gradient; se false l'icona è grigia/spenta.

interface ChampionIconProps {
  className?: string;
  active?: boolean;
}

let GID = 0;
const useGradId = (prefix: string) => {
  const ref = React.useRef<string | null>(null);
  if (ref.current === null) ref.current = `${prefix}-${GID++}`;
  return ref.current;
};

// 1) CAMPIONE — trofeo dorato leggendario (coppa + manici + gemma + base)
export const CampioneIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("camp");
  const gem = useGradId("campgem");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="6" y1="3" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#F59E0B" : "#4b5563"} />
          <stop offset="1" stopColor={active ? "#B45309" : "#374151"} />
        </linearGradient>
        <radialGradient id={gem} cx="0.5" cy="0.4" r="0.7">
          <stop stopColor={active ? "#FCA5A5" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#DC2626" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* luccichii leggendari */}
      {active && (
        <g fill="#FDE68A">
          <path d="M3.1 3.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5.5-1.3z" opacity="0.95" />
          <path d="M20.7 8.4l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4.4-1z" opacity="0.8" />
        </g>
      )}
      {/* manici */}
      <path d="M6.5 5H3.6c0 2.9 1.5 4.5 3.7 4.9" stroke={active ? "#FBBF24" : "#4b5563"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M17.5 5h2.9c0 2.9-1.5 4.5-3.7 4.9" stroke={active ? "#FBBF24" : "#4b5563"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* coppa */}
      <path
        d="M6 3.6h12v3.9c0 3.3-2.7 6-6 6s-6-2.7-6-6V3.6z"
        fill={`url(#${g})`}
        stroke={active ? "#92400E" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* stelo */}
      <rect x="10.9" y="13.1" width="2.2" height="3" fill={`url(#${g})`} />
      {/* base superiore */}
      <rect x="8" y="16" width="8" height="1.9" rx="0.7" fill={`url(#${g})`} stroke={active ? "#92400E" : "#374151"} strokeWidth="0.5" />
      {/* base inferiore */}
      <rect x="6.2" y="17.7" width="11.6" height="2.4" rx="1" fill={`url(#${g})`} stroke={active ? "#92400E" : "#374151"} strokeWidth="0.5" />
      {/* gemma centrale */}
      <circle cx="12" cy="6.9" r="1.7" fill={`url(#${gem})`} stroke={active ? "#92400E" : "#374151"} strokeWidth="0.4" />
      {/* riflesso sulla coppa */}
      {active && (
        <path d="M8.3 4.6c-.4 1.7-.2 3.2.5 4.4" stroke="#FFFBEB" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" fill="none" />
      )}
    </svg>
  );
};

// 2) CAMPIONE DELLA SETTIMANA — corona
export const SettimanaIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("sett");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="0" y1="4" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#E5E7EB" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#9CA3AF" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* corpo corona */}
      <path
        d="M4 8l3.2 3 4.8-5 4.8 5L20 8l-1.4 9H5.4L4 8z"
        fill={`url(#${g})`}
        stroke={active ? "#6B7280" : "#374151"}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* base */}
      <rect x="5" y="17.5" width="14" height="2.4" rx="1" fill={`url(#${g})`} stroke={active ? "#6B7280" : "#374151"} strokeWidth="0.6" />
      {/* gemme punte */}
      <circle cx="4" cy="8" r="1.3" fill={active ? "#67E8F9" : "#4b5563"} />
      <circle cx="20" cy="8" r="1.3" fill={active ? "#67E8F9" : "#4b5563"} />
      <circle cx="12" cy="6" r="1.4" fill={active ? "#A7F3D0" : "#4b5563"} />
    </svg>
  );
};

// 🏅 MEDAGLIA per piazzamento (oro/argento/bronzo) con numero al centro.
const MEDAL_TIERS = {
  gold: { from: "#FDE68A", to: "#F59E0B", ring: "#B45309", ribbon: "#F59E0B" },
  silver: { from: "#E5E7EB", to: "#9CA3AF", ring: "#6B7280", ribbon: "#9CA3AF" },
  bronze: { from: "#FCD9B6", to: "#C2703D", ring: "#8A4B24", ribbon: "#C2703D" },
  sapphire: { from: "#BFDBFE", to: "#3B82F6", ring: "#1E40AF", ribbon: "#2563EB" },
  amethyst: { from: "#F5D0FE", to: "#C026D3", ring: "#86198F", ribbon: "#A21CAF" },
} as const;

// 🏅 MEDAGLIA DI RANGO (2°-5°) — nastro integrato + medaglione metallico
// bisellato con numero "inciso" (copia chiara sotto + numero scuro sopra).
export const RankMedalIcon: React.FC<ChampionIconProps & { tier: keyof typeof MEDAL_TIERS; place: number }> = ({
  className,
  tier,
  place,
}) => {
  const g = useGradId("rankmedal");
  const t = MEDAL_TIERS[tier];
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="6" y1="8" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor={t.from} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
      </defs>
      {/* nastro dietro al medaglione (entra sotto il disco) */}
      <path d="M12 11L8.6 11 5.4 2.2 8.8 2.2z" fill={t.ribbon} />
      <path d="M12 11L15.4 11 18.6 2.2 15.2 2.2z" fill={t.ribbon} opacity="0.78" />
      {/* medaglione */}
      <circle cx="12" cy="14.8" r="7.4" fill={`url(#${g})`} stroke={t.ring} strokeWidth="1" />
      {/* bisello interno */}
      <circle cx="12" cy="14.8" r="5.6" fill="none" stroke={t.ring} strokeWidth="0.6" opacity="0.45" />
      {/* riflesso metallico */}
      <path d="M8 11.4a5.4 5.4 0 0 1 4-1.7" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" fill="none" />
      {/* numero inciso: copia chiara sotto */}
      <text x="12" y="15.95" textAnchor="middle" dominantBaseline="central" fontSize="8.5" fontWeight="900" fill="#ffffff" opacity="0.45">
        {place}
      </text>
      {/* numero inciso: scuro sopra */}
      <text x="12" y="15.4" textAnchor="middle" dominantBaseline="central" fontSize="8.5" fontWeight="900" fill={t.ring}>
        {place}
      </text>
    </svg>
  );
};

export const MedalIcon: React.FC<ChampionIconProps & { tier: keyof typeof MEDAL_TIERS; place: number }> = ({
  className,
  tier,
  place,
}) => {
  const g = useGradId("medal");
  const t = MEDAL_TIERS[tier];
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="6" y1="9" x2="18" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={t.from} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
      </defs>
      {/* nastri */}
      <path d="M8.5 3l3 8-3 1.5L6 5l2.5-2z" fill={t.ribbon} opacity="0.9" />
      <path d="M15.5 3l-3 8 3 1.5L18 5l-2.5-2z" fill={t.ribbon} opacity="0.7" />
      {/* medaglione */}
      <circle cx="12" cy="15.5" r="6" fill={`url(#${g})`} stroke={t.ring} strokeWidth="0.9" />
      <circle cx="12" cy="15.5" r="4.2" fill="none" stroke={t.ring} strokeWidth="0.5" opacity="0.5" />
      <text
        x="12"
        y="15.9"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="6"
        fontWeight="900"
        fill={t.ring}
      >
        {place}
      </text>
    </svg>
  );
};

// 💀 ELIMINATO — teschio (rosa/rosso)
export const EliminatedIcon: React.FC<ChampionIconProps> = ({ className }) => {
  const g = useGradId("skull");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      {/* cranio + mascella */}
      <path
        d="M12 3c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 4 2.5 5v2.2c0 .9.7 1.6 1.6 1.6h.9v-1.8h1.2v1.8h2.6v-1.8h1.2v1.8h.9c.9 0 1.6-.7 1.6-1.6V15c1.4-1 2.5-2.6 2.5-5 0-4-3.1-7-7.5-7z"
        fill={`url(#${g})`}
        stroke="#9F1239"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* occhiaie */}
      <ellipse cx="9" cy="11" rx="1.9" ry="2.2" fill="#7F1D1D" />
      <ellipse cx="15" cy="11" rx="1.9" ry="2.2" fill="#7F1D1D" />
      {/* naso */}
      <path d="M12 12.6l-1 2h2l-1-2z" fill="#7F1D1D" />
    </svg>
  );
};

// 4) TORNEI VINTI — coppa del torneo (gradient fuchsia/rosa)
export const TorneiIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("torn");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="0" y1="3" x2="0" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F9A8D4" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#C026D3" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* manici */}
      <path d="M6 6H3.6c0 2.6 1.2 4 3.4 4.3" stroke={active ? "#E879F9" : "#4b5563"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M18 6h2.4c0 2.6-1.2 4-3.4 4.3" stroke={active ? "#E879F9" : "#4b5563"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* coppa */}
      <path
        d="M6 4h12v3.5c0 3.3-2.7 6-6 6s-6-2.7-6-6V4z"
        fill={`url(#${g})`}
        stroke={active ? "#A21CAF" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* stelo */}
      <rect x="11" y="13" width="2" height="3.6" fill={`url(#${g})`} />
      {/* base */}
      <rect x="7.5" y="16.4" width="9" height="2" rx="0.8" fill={`url(#${g})`} stroke={active ? "#A21CAF" : "#374151"} strokeWidth="0.5" />
      <rect x="6" y="18.2" width="12" height="2.2" rx="1" fill={`url(#${g})`} stroke={active ? "#A21CAF" : "#374151"} strokeWidth="0.5" />
      {/* riflesso/stella sulla coppa */}
      {active && (
        <path d="M12 6.2l.6 1.3 1.4.2-1 1 .25 1.4L12 9.4l-1.25.7.25-1.4-1-1 1.4-.2.6-1.3z" fill="#FCE7F3" opacity="0.85" />
      )}
    </svg>
  );
};

// 3) CAMPIONE DEL MESE — corona regale con gemma centrale e raggi
export const MeseIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("mese");
  const gem = useGradId("mesegem");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="0" y1="4" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#D97706" : "#4b5563"} />
        </linearGradient>
        <radialGradient id={gem} cx="0.5" cy="0.4" r="0.7">
          <stop stopColor={active ? "#F9A8D4" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#DB2777" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* raggi */}
      {active && (
        <g stroke="#FBBF24" strokeWidth="1.1" strokeLinecap="round" opacity="0.8">
          <line x1="12" y1="1.5" x2="12" y2="3.4" />
          <line x1="3.5" y1="4" x2="4.8" y2="5.3" />
          <line x1="20.5" y1="4" x2="19.2" y2="5.3" />
        </g>
      )}
      {/* corpo corona */}
      <path
        d="M3.5 9l3.5 3.2L12 6l5 6.2L20.5 9 19 18H5L3.5 9z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* base */}
      <rect x="4.6" y="18.2" width="14.8" height="2.6" rx="1.1" fill={`url(#${g})`} stroke={active ? "#B45309" : "#374151"} strokeWidth="0.6" />
      {/* gemma centrale */}
      <circle cx="12" cy="13.5" r="2" fill={`url(#${gem})`} stroke={active ? "#9D174D" : "#374151"} strokeWidth="0.5" />
    </svg>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 🎯 TITOLI OBIETTIVO (milestone). Ogni icona è UNICA e rappresenta qualcosa
//    di speciale, ma tutte sono disegnate nello stesso viewBox 24×24 con
//    ingombro centrato simile → nel pannello appaiono della STESSA dimensione.
//    `active` accende il gradient; se false l'icona è spenta/grigia.
//    Vittorie: Rising Star(comet,50) → Shining Star(sole,100) →
//              Superstar(fiamma,500) → Legend(alloro,1000).
//    ELO:      ELO Expert(diamante,2500) → ELO Virtuoso(gemma+corona,3000).
// ───────────────────────────────────────────────────────────────────────────

// 50 vittorie — RISING STAR: cometa (stella con scia, ambra)
export const VeteranIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-rising");
  const trail = active ? "#FDBA74" : "#4b5563";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="9" y1="3" x2="21" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* scia della cometa */}
      <path d="M3.5 20.5 L9 15" stroke={trail} strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
      <path d="M3.6 16.4 L7.3 12.9" stroke={trail} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M7.6 20.4 L11 17" stroke={trail} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* stella */}
      <path
        d="M15 3 L16.53 6.9 L20.71 7.15 L17.47 9.8 L18.53 13.85 L15 11.6 L11.47 13.85 L12.53 9.8 L9.29 7.15 L13.47 6.9 Z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 100 vittorie — SHINING STAR: sole radiante (oro)
export const GladiatorIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-shining");
  const ray = active ? "#FBBF24" : "#4b5563";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={g} cx="0.5" cy="0.45" r="0.55">
          <stop stopColor={active ? "#FEF9C3" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* raggi */}
      <g stroke={ray} strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 1.8 V4.2" />
        <path d="M12 19.8 V22.2" />
        <path d="M1.8 12 H4.2" />
        <path d="M19.8 12 H22.2" />
        <path d="M4.8 4.8 L6.5 6.5" />
        <path d="M17.5 17.5 L19.2 19.2" />
        <path d="M19.2 4.8 L17.5 6.5" />
        <path d="M6.5 17.5 L4.8 19.2" />
      </g>
      {/* disco solare */}
      <circle cx="12" cy="12" r="4.8" fill={`url(#${g})`} stroke={active ? "#B45309" : "#374151"} strokeWidth="0.8" />
    </svg>
  );
};

// 500 vittorie — SUPERSTAR: fiamma ardente ("sei on fire", rosso/arancio)
export const WarlordIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-super");
  const gi = useGradId("ms-super-in");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="12" y1="2" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FB923C" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#DC2626" : "#4b5563"} />
        </linearGradient>
        <linearGradient id={gi} x1="12" y1="8" x2="12" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF08A" : "#9ca3af"} />
          <stop offset="1" stopColor={active ? "#F97316" : "#6b7280"} />
        </linearGradient>
      </defs>
      {/* fiamma esterna */}
      <path
        d="M12 2.5 C 16.5 6.5 18.5 10 17.5 14 C 16.7 17.6 14.4 20.2 12 21 C 9.6 20.2 7.3 17.6 6.5 14 C 5.7 10.2 8 7.5 9.2 9.5 C 9.6 7 10.4 4.8 12 2.5 Z"
        fill={`url(#${g})`}
        stroke={active ? "#991B1B" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* fiamma interna */}
      <path
        d="M12 9 C 14 11 14.6 13 14 15.3 C 13.6 17 12.9 18.3 12 19 C 11.1 18.3 10.4 17 10 15.3 C 9.5 13.2 10.3 11.6 12 9 Z"
        fill={`url(#${gi})`}
      />
    </svg>
  );
};

// 1000 vittorie — LEGEND: corona d'alloro con stella (oro + stella prismatica)
export const LegendIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-legend");
  const leaf = active ? "#34D399" : "#4b5563";
  const stem = active ? "#10B981" : "#4b5563";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="8" y1="5" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* rami d'alloro */}
      <path d="M11.3 21 C 5.5 19.4 3.6 13 6.4 7.4" stroke={stem} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M12.7 21 C 18.5 19.4 20.4 13 17.6 7.4" stroke={stem} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* foglie sinistra */}
      <g fill={leaf}>
        <ellipse cx="4.7" cy="11.2" rx="1.7" ry="0.85" transform="rotate(-40 4.7 11.2)" />
        <ellipse cx="5.0" cy="14.6" rx="1.7" ry="0.85" transform="rotate(-20 5.0 14.6)" />
        <ellipse cx="6.6" cy="17.6" rx="1.7" ry="0.85" transform="rotate(-4 6.6 17.6)" />
        {/* foglie destra */}
        <ellipse cx="19.3" cy="11.2" rx="1.7" ry="0.85" transform="rotate(40 19.3 11.2)" />
        <ellipse cx="19.0" cy="14.6" rx="1.7" ry="0.85" transform="rotate(20 19.0 14.6)" />
        <ellipse cx="17.4" cy="17.6" rx="1.7" ry="0.85" transform="rotate(4 17.4 17.6)" />
      </g>
      {/* stella centrale */}
      <path
        d="M12 5 L13.24 8.16 L16.62 8.34 L13.99 10.46 L14.85 13.74 L12 11.9 L9.15 13.74 L10.01 10.46 L7.38 8.34 L10.76 8.16 Z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 2500 ELO — ELO EXPERT: diamante taglio brillante (zaffiro)
export const EloMasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const crown = useGradId("ms-expert-c");
  const pav = useGradId("ms-expert-p");
  const line = active ? "#1E3A8A" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={crown} x1="4" y1="5" x2="20" y2="9.5" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#DBEAFE" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#60A5FA" : "#565d6b"} />
        </linearGradient>
        <linearGradient id={pav} x1="4" y1="9.5" x2="14" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#3B82F6" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#1D4ED8" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* corona (parte alta) e padiglione (punta) */}
      <path d="M7 5 L17 5 L20.5 9.3 L3.5 9.3 Z" fill={`url(#${crown})`} stroke={line} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M3.5 9.3 L20.5 9.3 L12 20.8 Z" fill={`url(#${pav})`} stroke={line} strokeWidth="0.8" strokeLinejoin="round" />
      {/* faccette */}
      <g stroke={line} strokeWidth="0.55" opacity="0.5" fill="none">
        <path d="M7 5 L9.2 9.3 L12 20.8" />
        <path d="M17 5 L14.8 9.3 L12 20.8" />
        <path d="M9.2 9.3 H14.8" />
        <path d="M3.5 9.3 L9.2 9.3 M20.5 9.3 L14.8 9.3" />
      </g>
      {active && <path d="M8.4 6.2 L10.6 6.2" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />}
    </svg>
  );
};

// 3000 ELO — ELO VIRTUOSO: gemma ametista con coroncina (massima maestria)
export const EloGrandmasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-virtuoso");
  const gc = useGradId("ms-virtuoso-c");
  const line = active ? "#6B21A8" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="8" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#E9D5FF" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#9333EA" : "#4b5563"} />
        </linearGradient>
        <linearGradient id={gc} x1="8" y1="3" x2="16" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* coroncina sopra la gemma */}
      <path
        d="M7.5 7.4 L8.6 4.3 L10.8 6.1 L12 3.5 L13.2 6.1 L15.4 4.3 L16.5 7.4 Z"
        fill={`url(#${gc})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      {/* gemma ametista */}
      <path d="M6.5 8.6 L17.5 8.6 L20 11.6 L12 20.8 L4 11.6 Z" fill={`url(#${g})`} stroke={line} strokeWidth="0.8" strokeLinejoin="round" />
      <g stroke={line} strokeWidth="0.55" opacity="0.5" fill="none">
        <path d="M4 11.6 H20" />
        <path d="M9 11.6 L12 20.8" />
        <path d="M15 11.6 L12 20.8" />
        <path d="M9 11.6 L9.6 8.6 M15 11.6 L14.4 8.6" />
      </g>
      {active && <path d="M6.6 10.6 L8.4 10" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />}
    </svg>
  );
};
