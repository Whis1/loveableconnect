import { cn } from "@/lib/utils";
import { profileImageUrl } from "@/lib/imageUrl";

interface ProfileAvatarProps {
  /** URL pubblico gia' risolto oppure path dello storage (es. avatar_url). */
  src?: string | null;
  /** Nome usato per l'iniziale di fallback quando non c'e' foto. */
  name?: string | null;
  /** Classi per dimensione/bordo del cerchio (es. "h-20 w-20 border-4"). */
  className?: string;
  /** Preset di ottimizzazione quando src e' un path dello storage. */
  preset?: "thumb" | "grid";
}

/**
 * Avatar circolare che mostra la FOTO INTERA senza tagliarla ne' deformarla:
 * davanti la foto in object-contain (si vede tutto il soggetto/volto), dietro
 * lo stesso scatto sfocato in object-cover per riempire il cerchio in modo
 * elegante. Stessa tecnica usata nelle card della bacheca.
 */
export const ProfileAvatar = ({ src, name, className, preset = "thumb" }: ProfileAvatarProps) => {
  const url = src
    ? (/^https?:\/\//i.test(src) ? src : profileImageUrl(src, preset, "contain"))
    : "";
  const initial = (name?.trim()?.[0] || "?").toUpperCase();

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full bg-muted", className)}>
      {url ? (
        <>
          {/* Sfondo: stesso scatto sfocato che riempie il cerchio */}
          <img
            src={url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover scale-110 blur-md opacity-50"
          />
          {/* Foto intera, mai tagliata */}
          <img
            src={url}
            alt={name || "Profilo"}
            className="relative h-full w-full object-contain"
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500 to-fuchsia-600 text-lg font-semibold text-white">
          {initial}
        </div>
      )}
    </div>
  );
};
