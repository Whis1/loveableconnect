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
// 🎯 TITOLI OBIETTIVO (milestone). Stesso stile: prop `active` accende il
//    gradient, altrimenti l'icona è spenta/grigia.
//    Vittorie: Rising Star(50) → Shining Star(100) → Superstar(500) → Legend(1000).
//    ELO:      ELO Expert(2500) → ELO Virtuoso(3000).
//    Tutte le icone usano gli STESSI path (STAR/GEM) → identica dimensione.
// ───────────────────────────────────────────────────────────────────────────

// Forme condivise: tutte le icone obiettivo hanno la STESSA dimensione.
const STAR =
  "M12 3 L14.18 9.01 L20.56 9.22 L15.52 13.14 L17.29 19.28 L12 15.7 L6.71 19.28 L8.48 13.14 L3.44 9.22 L9.82 9.01 Z";
const GEM = "M12 3.5 L20 11 L12 20.5 L4 11 Z";

// 50 vittorie — RISING STAR: stella (bronzo)
export const VeteranIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-rising");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FCD9B6" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#C2703D" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${g})`} stroke={active ? "#8A4B24" : "#374151"} strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
};

// 100 vittorie — SHINING STAR: stella (argento)
export const GladiatorIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-shining");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F1F5F9" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#94A3B8" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${g})`} stroke={active ? "#64748B" : "#374151"} strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
};

// 500 vittorie — SUPERSTAR: stella (oro)
export const WarlordIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-super");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${g})`} stroke={active ? "#B45309" : "#374151"} strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
};

// 1000 vittorie — LEGEND: stella prismatica (leggendaria)
export const LegendIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-legend");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F9A8D4" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#C084FC" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#67E8F9" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${g})`} stroke={active ? "#7C3AED" : "#374151"} strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
};

// 2500 ELO — ELO EXPERT: gemma zaffiro
export const EloMasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-expert");
  const line = active ? "#1E3A8A" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#BFDBFE" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#2563EB" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path d={GEM} fill={`url(#${g})`} stroke={line} strokeWidth="0.8" strokeLinejoin="round" />
      <g stroke={line} strokeWidth="0.6" opacity="0.55" fill="none">
        <path d="M4 11 H20" />
        <path d="M8.5 11 L12 20.5" />
        <path d="M15.5 11 L12 20.5" />
        <path d="M12 3.5 V11" />
      </g>
      {active && <path d="M7.5 7 L10.5 5" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />}
    </svg>
  );
};

// 3000 ELO — ELO VIRTUOSO: gemma ametista
export const EloGrandmasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-virtuoso");
  const line = active ? "#6B21A8" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#E9D5FF" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#9333EA" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path d={GEM} fill={`url(#${g})`} stroke={line} strokeWidth="0.8" strokeLinejoin="round" />
      <g stroke={line} strokeWidth="0.6" opacity="0.55" fill="none">
        <path d="M4 11 H20" />
        <path d="M8.5 11 L12 20.5" />
        <path d="M15.5 11 L12 20.5" />
        <path d="M12 3.5 V11" />
      </g>
      {active && (
        <path d="M16.4 5.8l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" fill="#ffffff" opacity="0.75" />
      )}
    </svg>
  );
};
