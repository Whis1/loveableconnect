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
//    Vittorie (tema "Mind"): Cunning Mind(lampadina,50) →
//      Strategic Mind(torre scacchi,100) → Flawless Mind(cervello,500) →
//      Absolute Mind(occhio onnisciente,1000).
//    ELO:    Apex(vetta,2500) → Zenith(astro allo zenit,3000).
// ───────────────────────────────────────────────────────────────────────────

// 50 vittorie — CUNNING MIND: lampadina (idea/astuzia, bronzo)
export const VeteranIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-cunning");
  const base = active ? "#A16207" : "#4b5563";
  const fil = active ? "#92400E" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="6" y1="3" x2="18" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#D97706" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* vetro */}
      <path
        d="M12 3.4 C 8.6 3.4 6 6 6 9.4 C 6 11.5 7.1 13.1 8.4 14.2 L8.4 15.6 L15.6 15.6 L15.6 14.2 C 16.9 13.1 18 11.5 18 9.4 C 18 6 15.4 3.4 12 3.4 Z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* filamento */}
      <path d="M9.8 9 L11.2 11 L12 9.7 L12.8 11 L14.2 9" stroke={fil} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* base a vite */}
      <rect x="8.7" y="16.4" width="6.6" height="1.5" rx="0.6" fill={base} />
      <rect x="9.4" y="18.3" width="5.2" height="1.4" rx="0.6" fill={base} />
      <path d="M10.4 20.5 H13.6" stroke={base} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

// 100 vittorie — STRATEGIC MIND: torre degli scacchi (strategia, argento)
export const GladiatorIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-strategic");
  const line = active ? "#475569" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F1F5F9" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#94A3B8" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* corpo torre con merlature */}
      <path
        d="M6.5 4 H8.4 V5.6 H10.1 V4 H13.9 V5.6 H15.6 V4 H17.5 V7.4 L15.7 9.2 V13.6 L17.2 18.2 H6.8 L8.3 13.6 V9.2 L6.5 7.4 Z"
        fill={`url(#${g})`}
        stroke={line}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* base */}
      <rect x="5.6" y="18.2" width="12.8" height="2.2" rx="0.8" fill={`url(#${g})`} stroke={line} strokeWidth="0.6" />
    </svg>
  );
};

// 500 vittorie — FLAWLESS MIND: cervello (genio, oro)
export const WarlordIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-flawless");
  const fold = active ? "#B45309" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="5" y1="5" x2="19" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      <path
        d="M12 5 C 9.6 5 7.7 6.6 7.6 8.8 C 6 8.9 5 10.3 5.7 11.7 C 4.9 12.7 5.4 14.2 6.7 14.5 C 6.9 16.1 8.4 17.2 10 16.8 C 10.6 17.7 11.6 18 12 17.8 C 12.4 18 13.4 17.7 14 16.8 C 15.6 17.2 17.1 16.1 17.3 14.5 C 18.6 14.2 19.1 12.7 18.3 11.7 C 19 10.3 18 8.9 16.4 8.8 C 16.3 6.6 14.4 5 12 5 Z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* circonvoluzioni */}
      <g stroke={fold} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.7">
        <path d="M12 6 V17.4" />
        <path d="M9.4 8.6 C 8.3 9 8.3 10.2 9.4 10.6" />
        <path d="M14.6 8.6 C 15.7 9 15.7 10.2 14.6 10.6" />
        <path d="M8.7 12.6 C 9.8 12.8 10.2 13.7 9.9 14.6" />
        <path d="M15.3 12.6 C 14.2 12.8 13.8 13.7 14.1 14.6" />
      </g>
    </svg>
  );
};

// 1000 vittorie — ABSOLUTE MIND: occhio onnisciente (prismatico)
export const LegendIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-absolute");
  const ray = active ? "#A78BFA" : "#4b5563";
  const line = active ? "#5B21B6" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="8" x2="20" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F9A8D4" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#C084FC" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#67E8F9" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* raggi sopra */}
      {active && (
        <g stroke={ray} strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
          <path d="M12 2.4 V4.2" />
          <path d="M6.4 4 L7.5 5.4" />
          <path d="M17.6 4 L16.5 5.4" />
        </g>
      )}
      {/* occhio */}
      <path
        d="M3.6 12 C 6.2 8.3 9 6.7 12 6.7 C 15 6.7 17.8 8.3 20.4 12 C 17.8 15.7 15 17.3 12 17.3 C 9 17.3 6.2 15.7 3.6 12 Z"
        fill={`url(#${g})`}
        stroke={line}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* iride + pupilla */}
      <circle cx="12" cy="12" r="3" fill={active ? "#1E1B4B" : "#374151"} />
      <circle cx="12" cy="12" r="1.3" fill={active ? "#E0E7FF" : "#9ca3af"} />
    </svg>
  );
};

// 2500 ELO — APEX: vetta di montagna con bandiera (l'apice, oro)
export const EloMasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-apex");
  const snow = active ? "#FEF9C3" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="7" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#D97706" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* montagna a tre cime, quella centrale più alta */}
      <path
        d="M2.5 19.5 L8 11 L10.6 14.8 L12 6 L13.4 14.8 L16 11 L21.5 19.5 Z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* neve sulla vetta centrale */}
      <path d="M10.6 9.4 L12 6 L13.4 9.4 Z" fill={snow} />
      {/* bandierina sull'apice */}
      <path d="M12 6 V2.8" stroke={active ? "#B45309" : "#4b5563"} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M12 3 L14.4 3.9 L12 4.8 Z" fill={active ? "#EF4444" : "#6b7280"} />
    </svg>
  );
};

// 3000 ELO — ZENITH: astro allo zenit sopra la volta celeste (ciano-viola)
export const EloGrandmasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-zenith");
  const beam = active ? "#67E8F9" : "#4b5563";
  const dome = active ? "#7C3AED" : "#4b5563";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={g} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor={active ? "#CFFAFE" : "#9ca3af"} />
          <stop offset="0.55" stopColor={active ? "#A5B4FC" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#7C3AED" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* volta celeste */}
      <path d="M4 19 C 4 12.8 7.6 9.5 12 9.5 C 16.4 9.5 20 12.8 20 19" stroke={dome} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M3.5 19.2 H20.5" stroke={dome} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* raggi dallo zenit */}
      {active && (
        <g stroke={beam} strokeWidth="1" strokeLinecap="round" opacity="0.9">
          <path d="M12 1.6 V3.4" />
          <path d="M6.7 4.2 L7.9 5.4" />
          <path d="M17.3 4.2 L16.1 5.4" />
        </g>
      )}
      {/* corpo celeste allo zenit */}
      <circle cx="12" cy="6.2" r="3" fill={`url(#${g})`} stroke={active ? "#5B21B6" : "#374151"} strokeWidth="0.7" />
    </svg>
  );
};
