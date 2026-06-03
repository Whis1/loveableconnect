// 🎨 Sistema di TEMI ESTETICI del profilo (stile "personalizzazione Discord").
//
// Ogni tema definisce delle classi CSS (definite in src/index.css) che vengono
// applicate alla card del profilo, all'avatar e al nome, per dare effetti
// particolari (bordo dorato con elettricità, neon, ecc.).
//
// Per AGGIUNGERE un nuovo tema:
//   1. definisci le classi CSS in index.css (es. .pt-neon-frame / -avatar / -name)
//   2. aggiungi una voce qui sotto con quei nomi di classe
//   3. (eventuale) metti premium:true se va riservato agli abbonati
//
// Il valore "id" e' quello salvato in profiles.profile_theme.

export type ProfileThemeId = "none" | "gold" | "neon" | "ice" | "fire";

export interface ProfileTheme {
  id: ProfileThemeId;
  name: string;
  description: string;
  /** Riservato agli abbonati Premium. */
  premium: boolean;
  /** Tema annunciato ma non ancora selezionabile. */
  comingSoon?: boolean;
  /** Gradiente mostrato nel pallino di scelta. */
  swatch: string;
  /** Classe applicata al contenitore/cornice della card. */
  frameClass: string;
  /** Classe applicata al cerchio avatar. */
  avatarClass: string;
  /** Classe applicata al testo del nome. */
  nameClass: string;
  /** Classe applicata alle icone (omini, nota musicale, ecc.). */
  iconClass: string;
  /** Tinta leggera/semi-trasparente per il pannello testi della card. */
  panelClass: string;
}

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: "none",
    name: "Nessuno",
    description: "Aspetto classico del profilo, senza effetti.",
    premium: false,
    swatch: "linear-gradient(135deg,#9ca3af,#4b5563)",
    frameClass: "",
    avatarClass: "",
    nameClass: "",
    iconClass: "",
    panelClass: "",
  },
  {
    id: "gold",
    name: "Estetica Premium",
    description: "Bordo dorato con elettricità che scorre e un glow acceso. Lussuoso.",
    premium: true,
    swatch: "linear-gradient(135deg,#fff7cc,#ffd700,#b8860b)",
    frameClass: "pt-gold-frame",
    avatarClass: "pt-gold-avatar",
    nameClass: "pt-gold-name",
    iconClass: "pt-gold-icon",
    panelClass: "pt-gold-panel",
  },
  // --- In arrivo (mostrano che il sistema e' estendibile) ---
  {
    id: "neon",
    name: "Neon Viola",
    description: "Contorni al neon viola/ciano pulsanti. In arrivo.",
    premium: true,
    comingSoon: true,
    swatch: "linear-gradient(135deg,#a855f7,#22d3ee)",
    frameClass: "",
    avatarClass: "",
    nameClass: "",
    iconClass: "",
    panelClass: "",
  },
  {
    id: "ice",
    name: "Ghiaccio",
    description: "Bordo cristallino azzurro con riflessi. In arrivo.",
    premium: true,
    comingSoon: true,
    swatch: "linear-gradient(135deg,#e0f2fe,#38bdf8,#0369a1)",
    frameClass: "",
    avatarClass: "",
    nameClass: "",
    iconClass: "",
    panelClass: "",
  },
  {
    id: "fire",
    name: "Fuoco",
    description: "Fiamme arancioni che danzano sul contorno. In arrivo.",
    premium: true,
    comingSoon: true,
    swatch: "linear-gradient(135deg,#fde68a,#f97316,#b91c1c)",
    frameClass: "",
    avatarClass: "",
    nameClass: "",
    iconClass: "",
    panelClass: "",
  },
];

export const DEFAULT_THEME: ProfileThemeId = "none";

export function getProfileTheme(id: string | null | undefined): ProfileTheme {
  return PROFILE_THEMES.find((t) => t.id === id) ?? PROFILE_THEMES[0];
}
