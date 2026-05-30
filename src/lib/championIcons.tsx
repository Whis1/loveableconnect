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

// 50 vittorie — CUNNING MIND: lampadina con alone, filamento a spirale, scintilla
export const VeteranIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-cunning");
  const base = active ? "#A16207" : "#4b5563";
  const fil = active ? "#92400E" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={g} cx="0.5" cy="0.42" r="0.62">
          <stop stopColor={active ? "#FFFBEB" : "#9ca3af"} />
          <stop offset="0.6" stopColor={active ? "#FCD34D" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#D97706" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* alone luminoso (raggi corti attorno al bulbo) */}
      {active && (
        <g stroke="#FBBF24" strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
          <path d="M12 1.4 V3" />
          <path d="M4.6 4.4 L5.8 5.6" />
          <path d="M19.4 4.4 L18.2 5.6" />
          <path d="M2.6 10.4 H4.1" />
          <path d="M19.9 10.4 H21.4" />
        </g>
      )}
      {/* vetro del bulbo */}
      <path
        d="M12 3.4 C 8.5 3.4 5.8 6 5.8 9.4 C 5.8 11.6 7 13.2 8.4 14.3 L8.6 15.8 L15.4 15.8 L15.6 14.3 C 17 13.2 18.2 11.6 18.2 9.4 C 18.2 6 15.5 3.4 12 3.4 Z"
        fill={`url(#${g})`}
        stroke={active ? "#B45309" : "#374151"}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* riflesso sul vetro */}
      {active && <path d="M9 6.4 C 8 7.2 7.6 8.4 7.8 9.6" stroke="#FFFDF5" strokeWidth="1" strokeLinecap="round" opacity="0.8" />}
      {/* filamento a spirale (idea) */}
      <path d="M9.7 11.2 C 9.7 9.4 11 8.6 12 9.8 C 13 11 14.3 10.2 14.3 8.6" stroke={fil} strokeWidth="0.95" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="9.9" r="0.55" fill={fil} />
      {/* scintilla */}
      {active && <path d="M17.4 6.6 l.35 .9 .9 .35 -.9 .35 -.35 .9 -.35 -.9 -.9 -.35 .9 -.35 z" fill="#FEF08A" />}
      {/* base a vite con filettatura */}
      <path d="M8.8 16.6 H15.2 M9 18.1 H15 M9.6 19.6 H14.4" stroke={base} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.6 21 H13.4" stroke={base} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
};

// 100 vittorie — STRATEGIC MIND: torre scacchi 3D con incisioni e ombre (argento)
export const GladiatorIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-strategic");
  const line = active ? "#475569" : "#374151";
  const shade = active ? "#64748B" : "#4b5563";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="6" y1="3" x2="18" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F8FAFC" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#CBD5E1" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#94A3B8" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* corpo torre con merlature */}
      <path
        d="M6.4 4 H8.4 V5.7 H10.1 V4 H13.9 V5.7 H15.6 V4 H17.6 V7.6 L15.6 9.4 V13.4 L17.3 18 H6.7 L8.4 13.4 V9.4 L6.4 7.6 Z"
        fill={`url(#${g})`}
        stroke={line}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* fascia centrale + incisioni verticali */}
      <path d="M7.7 11 H16.3" stroke={shade} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <g stroke={shade} strokeWidth="0.6" strokeLinecap="round" opacity="0.55">
        <path d="M9.5 11.6 V16.8" />
        <path d="M12 11.6 V16.8" />
        <path d="M14.5 11.6 V16.8" />
      </g>
      {/* riflesso */}
      {active && <path d="M9 5.2 V9.2" stroke="#FFFFFF" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />}
      {/* base a due gradini */}
      <rect x="6" y="18" width="12" height="1.5" rx="0.5" fill={`url(#${g})`} stroke={line} strokeWidth="0.55" />
      <rect x="5.2" y="19.4" width="13.6" height="1.7" rx="0.6" fill={`url(#${g})`} stroke={line} strokeWidth="0.55" />
    </svg>
  );
};

// 500 vittorie — FLAWLESS MIND: cervello stilizzato chiaro (due emisferi + giri)
export const WarlordIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-flawless");
  const fold = active ? "#9A3412" : "#374151";
  const line = active ? "#B45309" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* sagoma cervello: due lobi con gobbe superiori e tronco encefalico */}
      <path
        d="M12 4.6
           C 10.8 3.7 8.9 3.8 8 4.9
           C 6.6 4.6 5.2 5.6 5.2 7
           C 4 7.4 3.4 8.8 4.1 9.9
           C 3.3 10.9 3.6 12.5 4.8 13
           C 4.6 14.5 5.7 15.8 7.2 15.7
           C 7.6 17.2 9.4 17.9 10.7 17
           L 12 17.8 Z
           M12 4.6
           C 13.2 3.7 15.1 3.8 16 4.9
           C 17.4 4.6 18.8 5.6 18.8 7
           C 20 7.4 20.6 8.8 19.9 9.9
           C 20.7 10.9 20.4 12.5 19.2 13
           C 19.4 14.5 18.3 15.8 16.8 15.7
           C 16.4 17.2 14.6 17.9 13.3 17
           L 12 17.8 Z"
        fill={`url(#${g})`}
        stroke={line}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* solco centrale */}
      <path d="M12 4.8 V17.6" stroke={fold} strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
      {/* circonvoluzioni emisfero sinistro */}
      <g stroke={fold} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65">
        <path d="M9.8 6.4 C 8.3 6.7 8 8 9.2 8.6" />
        <path d="M7 8.2 C 6 8.9 6.3 10.2 7.6 10.4" />
        <path d="M8.8 11 C 7.6 11.3 7.4 12.6 8.6 13.2" />
        <path d="M10.2 14 C 9.2 14.2 9 15.2 9.9 15.8" />
      </g>
      {/* circonvoluzioni emisfero destro */}
      <g stroke={fold} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65">
        <path d="M14.2 6.4 C 15.7 6.7 16 8 14.8 8.6" />
        <path d="M17 8.2 C 18 8.9 17.7 10.2 16.4 10.4" />
        <path d="M15.2 11 C 16.4 11.3 16.6 12.6 15.4 13.2" />
        <path d="M13.8 14 C 14.8 14.2 15 15.2 14.1 15.8" />
      </g>
      {/* tronco encefalico */}
      <path d="M11.2 17.8 H12.8 L12.4 20.4 H11.6 Z" fill={`url(#${g})`} stroke={line} strokeWidth="0.55" strokeLinejoin="round" />
    </svg>
  );
};

// 1000 vittorie — ABSOLUTE MIND: occhio onnisciente in triangolo radiante (prismatico)
export const LegendIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const gIris = useGradId("ms-abs-iris");
  const gTri = useGradId("ms-abs-tri");
  const ray = active ? "#C4B5FD" : "#4b5563";
  const line = active ? "#5B21B6" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gTri} x1="6" y1="3.5" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#EDE9FE" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#8B5CF6" : "#4b5563"} />
        </linearGradient>
        <radialGradient id={gIris} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor={active ? "#67E8F9" : "#9ca3af"} />
          <stop offset="1" stopColor={active ? "#7C3AED" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* raggi attorno (corona prismatica) */}
      {active && (
        <g stroke={ray} strokeWidth="1" strokeLinecap="round" opacity="0.8">
          <path d="M12 1.4 V3" />
          <path d="M4.5 5 L5.7 6.2" />
          <path d="M19.5 5 L18.3 6.2" />
          <path d="M2.6 13 L4.1 12.5" />
          <path d="M21.4 13 L19.9 12.5" />
        </g>
      )}
      {/* triangolo */}
      <path d="M12 3.4 L20.4 19.4 H3.6 Z" fill={`url(#${gTri})`} stroke={line} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M12 6 L17.8 17.6 H6.2 Z" fill="none" stroke={line} strokeWidth="0.5" opacity="0.5" />
      {/* occhio */}
      <path d="M7.6 13.6 C 9 11.8 10.5 11 12 11 C 13.5 11 15 11.8 16.4 13.6 C 15 15.4 13.5 16.2 12 16.2 C 10.5 16.2 9 15.4 7.6 13.6 Z"
        fill={active ? "#FFFFFF" : "#9ca3af"} stroke={line} strokeWidth="0.6" strokeLinejoin="round" />
      <circle cx="12" cy="13.6" r="1.9" fill={`url(#${gIris})`} />
      <circle cx="12" cy="13.6" r="0.85" fill={active ? "#1E1B4B" : "#374151"} />
      {active && <circle cx="11.4" cy="13" r="0.4" fill="#FFFFFF" opacity="0.9" />}
    </svg>
  );
};

// 2500 ELO — APEX: vetta innevata con bandiera, sole dietro e crepacci incisi (oro)
export const EloMasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-apex");
  const snow = active ? "#FFFBEB" : "#9ca3af";
  const line = active ? "#92400E" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="6" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#B45309" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* sole dietro la vetta */}
      {active && <circle cx="16.6" cy="7" r="2.4" fill="#FCD34D" opacity="0.55" />}
      {/* montagna a tre cime */}
      <path
        d="M2.4 19.6 L8 10.5 L10.4 14.2 L12 5.4 L13.6 14.2 L16 10.5 L21.6 19.6 Z"
        fill={`url(#${g})`}
        stroke={line}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      {/* calotte nevose */}
      <path d="M10.5 9.2 L12 5.4 L13.5 9.2 L12.7 8.3 L12 9 L11.3 8.3 Z" fill={snow} />
      <path d="M6.9 13 L8 10.5 L9.1 13 L8.5 12.4 L8 12.9 L7.5 12.4 Z" fill={snow} opacity="0.9" />
      <path d="M14.9 13 L16 10.5 L17.1 13 L16.5 12.4 L16 12.9 L15.5 12.4 Z" fill={snow} opacity="0.9" />
      {/* crepacci incisi */}
      <g stroke={line} strokeWidth="0.55" strokeLinecap="round" opacity="0.5" fill="none">
        <path d="M12 9.4 L10.8 17" />
        <path d="M12 9.4 L13.2 17" />
        <path d="M8 12.9 L6.4 18.4" />
        <path d="M16 12.9 L17.6 18.4" />
      </g>
      {/* bandierina sull'apice */}
      <path d="M12 5.4 V2.4" stroke={line} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M12 2.6 L14.6 3.6 L12 4.6 Z" fill={active ? "#EF4444" : "#6b7280"} stroke={active ? "#B91C1C" : "#374151"} strokeWidth="0.4" strokeLinejoin="round" />
    </svg>
  );
};

// 3000 ELO — ZENITH: astro radiante con OCCHIO al centro, corona di raggi e stelle
export const EloGrandmasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("ms-zenith");
  const gIris = useGradId("ms-zenith-iris");
  const ray = active ? "#67E8F9" : "#4b5563";
  const dome = active ? "#6366F1" : "#4b5563";
  const line = active ? "#5B21B6" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={g} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor={active ? "#ECFEFF" : "#9ca3af"} />
          <stop offset="0.5" stopColor={active ? "#A5B4FC" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#7C3AED" : "#4b5563"} />
        </radialGradient>
        <radialGradient id={gIris} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor={active ? "#67E8F9" : "#9ca3af"} />
          <stop offset="1" stopColor={active ? "#7C3AED" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* corona di raggi attorno all'astro (lunghi e corti alternati) */}
      <g stroke={ray} strokeLinecap="round">
        <path d="M12 1 V3.4" strokeWidth="1.2" />
        <path d="M12 12.6 V14.6" strokeWidth="1" opacity="0.8" />
        <path d="M4.6 8 L6.7 9.1" strokeWidth="1" />
        <path d="M19.4 8 L17.3 9.1" strokeWidth="1" />
        <path d="M5.2 3.6 L6.9 5.3" strokeWidth="0.9" opacity="0.85" />
        <path d="M18.8 3.6 L17.1 5.3" strokeWidth="0.9" opacity="0.85" />
        <path d="M2.8 11.5 L4.7 11.2" strokeWidth="0.8" opacity="0.7" />
        <path d="M21.2 11.5 L19.3 11.2" strokeWidth="0.8" opacity="0.7" />
      </g>
      {/* astro */}
      <circle cx="12" cy="8" r="3.7" fill={`url(#${g})`} stroke={line} strokeWidth="0.7" />
      {/* 👁️ occhio radiante dentro l'astro */}
      <path
        d="M8.5 8 C 9.7 6.6 10.8 6.1 12 6.1 C 13.2 6.1 14.3 6.6 15.5 8 C 14.3 9.4 13.2 9.9 12 9.9 C 10.8 9.9 9.7 9.4 8.5 8 Z"
        fill={active ? "#FFFFFF" : "#cbd5e1"}
        stroke={line}
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8" r="1.5" fill={`url(#${gIris})`} />
      <circle cx="12" cy="8" r="0.62" fill={active ? "#1E1B4B" : "#374151"} />
      {active && <circle cx="11.55" cy="7.6" r="0.32" fill="#FFFFFF" opacity="0.9" />}
      {/* volta celeste con stelline */}
      <path d="M4.5 19.4 C 4.5 14.6 7.8 12 12 12 C 16.2 12 19.5 14.6 19.5 19.4" stroke={dome} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M3.6 19.6 H20.4" stroke={dome} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      {active && (
        <g fill="#E0E7FF">
          <path d="M7 16 l.3 .7 .7 .3 -.7 .3 -.3 .7 -.3 -.7 -.7 -.3 .7 -.3 z" />
          <path d="M16.6 15.4 l.25 .6 .6 .25 -.6 .25 -.25 .6 -.25 -.6 -.6 -.25 .6 -.25 z" />
        </g>
      )}
    </svg>
  );
};
