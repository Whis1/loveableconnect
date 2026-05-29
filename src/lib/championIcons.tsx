import React from "react";

// 🎖️ Icone SVG personalizzate per i titoli di Campione.
// Niente emoji: gradient + dettagli per un look premium. Escalation visiva:
//   Campione (alloro+stella) → Settimana (corona) → Mese (corona con gemma e raggi).
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

// 1) CAMPIONE — stella dentro corona d'alloro
export const CampioneIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("camp");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* alloro sinistro */}
      <path d="M6.5 5.5C4 7 3.2 10 4.2 13c1.8-.3 3.4-1.6 4-3.4" stroke={active ? "#34D399" : "#4b5563"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* alloro destro */}
      <path d="M17.5 5.5C20 7 20.8 10 19.8 13c-1.8-.3-3.4-1.6-4-3.4" stroke={active ? "#34D399" : "#4b5563"} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* stella centrale */}
      <path
        d="M12 6.2l1.7 3.5 3.8.5-2.8 2.6.7 3.8L12 15.4 8.6 17.2l.7-3.8-2.8-2.6 3.8-.5L12 6.2z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
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
