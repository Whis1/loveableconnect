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

// 🥈🥉 RANGHI 2°-5° — corona d'alloro con numero del piazzamento.
// `tone` regola il colore di alloro+numero per il massimo contrasto sul cerchio.
export const LaurelRankIcon: React.FC<{ className?: string; place: number; tone?: string }> = ({
  className,
  place,
  tone = "#FFFFFF",
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill={tone} stroke={tone} strokeWidth="0.8" strokeLinecap="round">
      {/* stelo sinistro */}
      <path d="M6.6 18.4C4.6 15.9 4.2 12.4 5.4 9.2" fill="none" strokeWidth="1.1" />
      <ellipse cx="4.6" cy="11.2" rx="1.4" ry="0.75" transform="rotate(-38 4.6 11.2)" />
      <ellipse cx="4.5" cy="13.8" rx="1.4" ry="0.75" transform="rotate(-22 4.5 13.8)" />
      <ellipse cx="5.2" cy="16.2" rx="1.4" ry="0.75" transform="rotate(-8 5.2 16.2)" />
      {/* stelo destro */}
      <path d="M17.4 18.4C19.4 15.9 19.8 12.4 18.6 9.2" fill="none" strokeWidth="1.1" />
      <ellipse cx="19.4" cy="11.2" rx="1.4" ry="0.75" transform="rotate(38 19.4 11.2)" />
      <ellipse cx="19.5" cy="13.8" rx="1.4" ry="0.75" transform="rotate(22 19.5 13.8)" />
      <ellipse cx="18.8" cy="16.2" rx="1.4" ry="0.75" transform="rotate(8 18.8 16.2)" />
    </g>
    <text
      x="12"
      y="13"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="11"
      fontWeight="900"
      fill={tone}
      stroke="none"
    >
      {place}
    </text>
  </svg>
);

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
} as const;

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
