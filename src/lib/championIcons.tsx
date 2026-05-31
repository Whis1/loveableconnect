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

// 2) WEEKLY CHAMPION — pedina del Re degli scacchi, dorata (semplice + croce in cima)
export const SettimanaIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("week");
  const line = active ? "#92400E" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="7" y1="2" x2="17" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#FBBF24" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#B45309" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* ♔ croce in cima */}
      <path d="M11 1.6 H13 V3.4 H14.8 V5.4 H13 V7 H11 V5.4 H9.2 V3.4 H11 Z"
        fill={`url(#${g})`} stroke={line} strokeWidth="0.5" strokeLinejoin="round" />
      {/* testa / colletto sotto la croce */}
      <path d="M9 7.6 C 9 6.6 15 6.6 15 7.6 C 15 8.5 14 9 12 9 C 10 9 9 8.5 9 7.6 Z"
        fill={`url(#${g})`} stroke={line} strokeWidth="0.6" strokeLinejoin="round" />
      {/* corpo svasato della pedina */}
      <path d="M9.5 9 C 9.2 11 8 12.4 7.2 14.4 C 6.6 15.9 6.4 17 6.4 18 H17.6 C 17.6 17 17.4 15.9 16.8 14.4 C 16 12.4 14.8 11 14.5 9 Z"
        fill={`url(#${g})`} stroke={line} strokeWidth="0.7" strokeLinejoin="round" />
      {/* fascia centrale (collare) */}
      <path d="M7.6 13.4 H16.4" stroke={line} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      {/* base a due gradini */}
      <rect x="6" y="18" width="12" height="1.7" rx="0.6" fill={`url(#${g})`} stroke={line} strokeWidth="0.5" />
      <rect x="5" y="19.5" width="14" height="1.9" rx="0.8" fill={`url(#${g})`} stroke={line} strokeWidth="0.5" />
      {/* riflesso */}
      {active && <path d="M10 9.6 C 9.2 11.4 8.6 13 8.7 14.8" stroke="#FFFBEB" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" fill="none" />}
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

// 3) MONTHLY CHAMPION — corona regale dorata con gemme
export const MeseIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const g = useGradId("month");
  const gem = useGradId("monthgem");
  const line = active ? "#92400E" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={g} x1="4" y1="5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#FBBF24" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#B45309" : "#4b5563"} />
        </linearGradient>
        <radialGradient id={gem} cx="0.5" cy="0.4" r="0.7">
          <stop stopColor={active ? "#FCA5A5" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#DC2626" : "#4b5563"} />
        </radialGradient>
      </defs>
      {/* 🔧 normalizza al riferimento (centro y≈11.9, altezza ≈16.8) — bbox 4..20 */}
      <g transform="translate(12 11.9) scale(1.05) translate(-12 -12)">
      {/* corpo corona a cinque punte */}
      <path
        d="M3.5 8.4 L7 12 L9.6 6.2 L12 10.2 L14.4 6.2 L17 12 L20.5 8.4 L18.8 17.4 H5.2 Z"
        fill={`url(#${g})`}
        stroke={line}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* riflesso interno */}
      {active && <path d="M7 13.4 C 6.7 14.6 6.8 15.6 7.4 16.4" stroke="#FFFBEB" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" fill="none" />}
      {/* gemme sulle punte */}
      <circle cx="3.5" cy="8.4" r="1.35" fill={`url(#${gem})`} stroke={line} strokeWidth="0.4" />
      <circle cx="20.5" cy="8.4" r="1.35" fill={`url(#${gem})`} stroke={line} strokeWidth="0.4" />
      <circle cx="12" cy="5.4" r="1.5" fill={`url(#${gem})`} stroke={line} strokeWidth="0.4" />
      {/* gemma centrale incastonata nella fascia */}
      <circle cx="12" cy="14.4" r="1.6" fill={`url(#${gem})`} stroke={line} strokeWidth="0.45" />
      {/* base della corona con bordo gemmato */}
      <rect x="4.6" y="17.2" width="14.8" height="2.8" rx="1" fill={`url(#${g})`} stroke={line} strokeWidth="0.6" />
      <g fill={active ? "#FDE68A" : "#6b7280"}>
        <circle cx="7" cy="18.6" r="0.55" />
        <circle cx="9.7" cy="18.6" r="0.55" />
        <circle cx="14.3" cy="18.6" r="0.55" />
        <circle cx="17" cy="18.6" r="0.55" />
      </g>
      </g>
    </svg>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 🎯 TITOLI OBIETTIVO (milestone). Ogni icona è UNICA e rappresenta qualcosa
//    di speciale, ma tutte sono disegnate nello stesso viewBox 24×24 con
//    ingombro centrato simile → nel pannello appaiono della STESSA dimensione.
//    `active` accende il gradient; se false l'icona è spenta/grigia.
//    Vittorie (tema "Mind"): Cunning Mind(maschere teatro,50) →
//      Strategic Mind(torre scacchi,100) → Flawless Mind(cervello,500) →
//      Masterful Mind(occhio onnisciente,1000).
//    ELO:    Apex(vetta,2500) → Zenith(cristalli blu/oro + stella su piedistallo,3000).
// ───────────────────────────────────────────────────────────────────────────

// 50 vittorie — CUNNING MIND: 🎭 maschere del teatro (commedia magenta + tragedia ciano, brillanti/rare)
export const VeteranIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const gM = useGradId("ms-cunning-m");
  const gC = useGradId("ms-cunning-c");
  const magenta = active ? `url(#${gM})` : "#6b7280";
  const cyan = active ? `url(#${gC})` : "#9ca3af";
  const mLine = active ? "#86198F" : "#374151";
  const cLine = active ? "#0E7490" : "#4b5563";
  const holes = active ? "#3B0764" : "#1f2937";
  const cHoles = active ? "#083344" : "#1f2937";
  // sagoma maschera teatrale centrata su cx
  const maskShape = (cx: number) =>
    `M ${cx - 3.6} 6 C ${cx - 3.6} 4.6 ${cx - 2} 3.8 ${cx} 3.8 C ${cx + 2} 3.8 ${cx + 3.6} 4.6 ${cx + 3.6} 6 C ${cx + 3.6} 9 ${cx + 2.6} 13 ${cx} 14.4 C ${cx - 2.6} 13 ${cx - 3.6} 9 ${cx - 3.6} 6 Z`;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gM} x1="6" y1="3" x2="13" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#F0ABFC" : "#9ca3af"} />
          <stop offset="1" stopColor={active ? "#C026D3" : "#4b5563"} />
        </linearGradient>
        <linearGradient id={gC} x1="11" y1="4" x2="18" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#A5F3FC" : "#a1a1aa"} />
          <stop offset="1" stopColor={active ? "#06B6D4" : "#565d6b"} />
        </linearGradient>
      </defs>
      {/* 🔧 normalizza: bbox y≈2.4..16.6 → centro y=12, altezza ~16.8 come le altre */}
      <g transform="translate(12 11.9) scale(1.18) translate(-12 -9.3)">
        {/* ✨ bagliori "rara" */}
        {active && (
          <g fill="#F5F3FF">
            <path d="M3.4 4.4 l.3 .7 .7 .3 -.7 .3 -.3 .7 -.3 -.7 -.7 -.3 .7 -.3 z" opacity="0.9" />
            <path d="M20.4 5.6 l.3 .7 .7 .3 -.7 .3 -.3 .7 -.3 -.7 -.7 -.3 .7 -.3 z" opacity="0.85" />
          </g>
        )}
        {/* maschera SINISTRA — commedia (magenta, sorride) */}
        <g transform="rotate(-12 9.5 9)">
          <path d={maskShape(9.5)} fill={magenta} stroke={mLine} strokeWidth="0.5" strokeLinejoin="round" />
          <ellipse cx="8" cy="7.5" rx="0.9" ry="1.2" fill={holes} />
          <ellipse cx="11" cy="7.5" rx="0.9" ry="1.2" fill={holes} />
          <path d="M7.6 10.4 C 8.4 11.6 10.6 11.6 11.4 10.4" stroke={holes} strokeWidth="0.85" fill="none" strokeLinecap="round" />
          {active && <path d="M7 5.4 C 6.4 6.4 6.3 7.6 6.7 8.6" stroke="#FDF4FF" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" fill="none" />}
        </g>
        {/* maschera DESTRA — tragedia (ciano, triste), un po' più in basso */}
        <g transform="rotate(12 14.5 10) translate(0 1)">
          <path d={maskShape(14.5)} fill={cyan} stroke={cLine} strokeWidth="0.5" strokeLinejoin="round" />
          <ellipse cx="13" cy="7.5" rx="0.9" ry="1.2" fill={cHoles} />
          <ellipse cx="16" cy="7.5" rx="0.9" ry="1.2" fill={cHoles} />
          <path d="M12.6 11 C 13.4 9.8 15.6 9.8 16.4 11" stroke={cHoles} strokeWidth="0.85" fill="none" strokeLinecap="round" />
          {active && <path d="M12 5.4 C 11.4 6.4 11.3 7.6 11.7 8.6" stroke="#ECFEFF" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" fill="none" />}
        </g>
      </g>
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

// 3000 ELO — ZENITH: cristalli appuntiti blu/oro con stella dorata su piedistallo (da immagine utente)
export const EloGrandmasterIcon: React.FC<ChampionIconProps> = ({ className, active = true }) => {
  const gBlue = useGradId("ms-zenith-blue");
  const gGold = useGradId("ms-zenith-gold");
  const gStar = useGradId("ms-zenith-star");
  const gPed = useGradId("ms-zenith-ped");
  const blueLine = active ? "#1E40AF" : "#374151";
  const goldLine = active ? "#92400E" : "#374151";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gBlue} x1="6" y1="6" x2="14" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#93C5FD" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#2563EB" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#1E3A8A" : "#4b5563"} />
        </linearGradient>
        <linearGradient id={gGold} x1="8" y1="3" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FEF3C7" : "#6b7280"} />
          <stop offset="0.5" stopColor={active ? "#FBBF24" : "#565d6b"} />
          <stop offset="1" stopColor={active ? "#B45309" : "#4b5563"} />
        </linearGradient>
        <radialGradient id={gStar} cx="0.5" cy="0.4" r="0.65">
          <stop stopColor={active ? "#FEF9C3" : "#9ca3af"} />
          <stop offset="1" stopColor={active ? "#F59E0B" : "#4b5563"} />
        </radialGradient>
        <linearGradient id={gPed} x1="4" y1="17" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor={active ? "#FDE68A" : "#6b7280"} />
          <stop offset="1" stopColor={active ? "#B45309" : "#4b5563"} />
        </linearGradient>
      </defs>
      {/* ✨ scintille */}
      {active && (
        <g fill="#FFFFFF">
          <path d="M5.4 6 l.25 .6 .6 .25 -.6 .25 -.25 .6 -.25 -.6 -.6 -.25 .6 -.25 z" opacity="0.9" />
          <path d="M18.8 7.4 l.25 .6 .6 .25 -.6 .25 -.25 .6 -.25 -.6 -.6 -.25 .6 -.25 z" opacity="0.85" />
        </g>
      )}

      {/* cristalli laterali ORO (esterni) */}
      <path d="M5 16 L4 9.5 L7.6 13.4 Z" fill={`url(#${gGold})`} stroke={goldLine} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M19 16 L20 9.5 L16.4 13.4 Z" fill={`url(#${gGold})`} stroke={goldLine} strokeWidth="0.5" strokeLinejoin="round" />

      {/* cristalli BLU (medi) */}
      <path d="M8 16.6 L6.6 7.6 L10 12.4 Z" fill={`url(#${gBlue})`} stroke={blueLine} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M16 16.6 L17.4 7.6 L14 12.4 Z" fill={`url(#${gBlue})`} stroke={blueLine} strokeWidth="0.5" strokeLinejoin="round" />

      {/* cristallo centrale ORO (il più alto, appuntito) */}
      <path d="M12 2.6 L9.6 8 L12 16.8 L14.4 8 Z" fill={`url(#${gGold})`} stroke={goldLine} strokeWidth="0.6" strokeLinejoin="round" />
      {/* faccetta del cristallo centrale */}
      <path d="M12 2.6 L12 16.8 L9.6 8 Z" fill="#ffffff" opacity={active ? "0.18" : "0"} />

      {/* cristalli BLU interni che salgono */}
      <path d="M10.4 16.4 L9.2 9.4 L12 13 Z" fill={`url(#${gBlue})`} stroke={blueLine} strokeWidth="0.45" strokeLinejoin="round" />
      <path d="M13.6 16.4 L14.8 9.4 L12 13 Z" fill={`url(#${gBlue})`} stroke={blueLine} strokeWidth="0.45" strokeLinejoin="round" />

      {/* ⭐ stella dorata al centro */}
      <path
        d="M12 6.3 L13.2 9 L16.1 9.25 L13.9 11.2 L14.6 14.05 L12 12.5 L9.4 14.05 L10.1 11.2 L7.9 9.25 L10.8 9 Z"
        fill={`url(#${gStar})`}
        stroke={goldLine}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* 🏛️ piedistallo (disco argento sopra + base oro a gradini) */}
      <ellipse cx="12" cy="17.4" rx="5.4" ry="1.5" fill={active ? "#E2E8F0" : "#9ca3af"} stroke={active ? "#94A3B8" : "#4b5563"} strokeWidth="0.5" />
      <ellipse cx="12" cy="16.9" rx="3.1" ry="0.9" fill={active ? "#CBD5E1" : "#6b7280"} />
      <path d="M6 18 H18 L17 20.4 Q12 21.6 7 20.4 Z" fill={`url(#${gPed})`} stroke={goldLine} strokeWidth="0.5" strokeLinejoin="round" />
      <ellipse cx="12" cy="20.6" rx="6" ry="1.5" fill={`url(#${gPed})`} stroke={goldLine} strokeWidth="0.5" />
      <ellipse cx="12" cy="20.3" rx="6" ry="1.3" fill={active ? "#D97706" : "#565d6b"} opacity="0.5" />
    </svg>
  );
};
