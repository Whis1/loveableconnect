import { ReactNode } from "react";
import { getProfileTheme } from "@/lib/profileThemes";

/**
 * Avvolge un avatar applicando l'anello del tema estetico (es. oro elettrico)
 * quando il profilo ha un tema attivo. Se il tema e' "nessuno" (o assente)
 * ritorna i figli invariati, senza aggiungere wrapper, per non alterare il
 * layout esistente.
 *
 * Uso: <ProfileThemeRing themeId={profile.profile_theme}><Avatar .../></ProfileThemeRing>
 */
export const ProfileThemeRing = ({
  themeId,
  children,
  className = "",
}: {
  themeId?: string | null;
  children: ReactNode;
  className?: string;
}) => {
  const ringClass = getProfileTheme(themeId).avatarClass;
  if (!ringClass) return <>{children}</>;
  return <div className={`${ringClass} ${className}`}>{children}</div>;
};
