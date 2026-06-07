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

export type ProfileThemeId = "none" | "gold" | "darkcrow";

export interface ProfileTheme {
  id: ProfileThemeId;
  name: string;
  description: string;
  /** Riservato agli abbonati Premium. */
  premium: boolean;
  /** Tema annunciato ma non ancora selezionabile. */
  comingSoon?: boolean;
  /** Acquisto una-tantum (permanente): si compra a parte, non con l'abbonamento. */
  oneTime?: boolean;
  /** Prezzo mostrato (es. "9,99") per i temi a pagamento una-tantum. */
  price?: string;
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
  /** Se true, il tema mostra il badge "Premium" sul profilo. */
  badge: boolean;
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
    badge: false,
  },
  {
    id: "gold",
    name: "Tema Esclusivo Premium",
    description: "Bordo dorato con elettricità che scorre e un glow acceso. Lussuoso.",
    premium: true,
    swatch: "linear-gradient(135deg,#fff7cc,#ffd700,#b8860b)",
    frameClass: "pt-gold-frame",
    avatarClass: "pt-gold-avatar",
    nameClass: "pt-gold-name",
    iconClass: "pt-gold-icon",
    panelClass: "pt-gold-panel",
    badge: true,
  },
  {
    id: "darkcrow",
    name: "Tema Dark Crow",
    description:
      "Atmosfera notturna ed epica: corvo reale, luna, nebbia e lampi che appaiono e si dissolvono. Nickname nero lucido, anello e cornice scuri.",
    premium: false, // NON e' un gate da abbonamento: si acquista a parte
    oneTime: true,
    price: "9,99",
    swatch: "linear-gradient(135deg,#2a2540,#14101f,#0a0810)",
    frameClass: "dc-frame",
    avatarClass: "dc-avatar",
    nameClass: "dc-name",
    iconClass: "dc-icon",
    panelClass: "dc-panel",
    badge: false,
  },
];

export const DEFAULT_THEME: ProfileThemeId = "none";

export function getProfileTheme(id: string | null | undefined): ProfileTheme {
  return PROFILE_THEMES.find((t) => t.id === id) ?? PROFILE_THEMES[0];
}
