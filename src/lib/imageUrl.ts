// 🖼️ URL immagini OTTIMIZZATE via trasformazioni Supabase Storage.
//
// Invece di servire la foto originale a piena risoluzione (anche diversi MB),
// chiediamo a Supabase una versione ridimensionata + compressa "al volo"
// tramite l'endpoint /render/image. Esempio reale misurato: avatar 174 KB →
// 50 KB a 400px/q70 (−71%). Sulle foto grandi il risparmio è molto maggiore.
//
// Vantaggi:
//   - bacheca molto più veloce (soprattutto su mobile / connessioni lente)
//   - traffico in uscita (bandwidth Supabase) tagliato del 70-90% → la voce
//     di costo che cresce di più con tanti utenti
//   - le versioni trasformate sono cache-ate sul CDN di Supabase
//
// Le trasformazioni sono ABILITATE su questo progetto (verificato).
//
// USO:
//   import { storageImageUrl } from "@/lib/imageUrl";
//   const url = storageImageUrl("profile-images", profile.avatar_url, "grid");

import { supabase } from "@/integrations/supabase/client";

// Preset di dimensioni per contesto d'uso. Larghezza in px del lato maggiore;
// quality 1-100 (più basso = file più leggero). Tarati per il design attuale.
export type ImagePreset = "thumb" | "grid" | "card" | "full";

const PRESETS: Record<ImagePreset, { width: number; quality: number }> = {
  // Mini avatar in liste/chat/notifiche (40-48px renderizzati → 96px retina)
  thumb: { width: 96, quality: 60 },
  // Card della bacheca / griglie profili (mostrati ~250-350px → 400px retina)
  grid: { width: 400, quality: 65 },
  // Profilo aperto / dialog (immagine grande ma non originale)
  card: { width: 800, quality: 72 },
  // Massima qualità ragionevole (es. fullscreen) senza servire l'originale
  full: { width: 1200, quality: 80 },
};

/**
 * Ritorna l'URL di un'immagine dello Storage, OTTIMIZZATA per il contesto.
 *
 * @param bucket  nome del bucket (es. "profile-images")
 * @param path    path dell'oggetto salvato nel DB (es. avatar_url). Può essere
 *                null/undefined → ritorna "".
 * @param preset  preset di dimensione/qualità ("thumb" | "grid" | "card" | "full")
 *
 * Note:
 *  - Se `path` è già un URL http(s) completo (es. avatar esterni/social) lo
 *    ritorna invariato: non possiamo trasformarlo.
 *  - Usa l'SDK (transform) così l'URL firmato/pubblico resta coerente con la
 *    config del client; ricade su getPublicUrl semplice se transform non c'è.
 */
export function storageImageUrl(
  bucket: string,
  path: string | null | undefined,
  preset: ImagePreset = "grid",
  // "cover" (default) riempie e ritaglia; "contain" rimpicciolisce mantenendo
  // l'intera immagine (usato dove mostriamo la foto intera senza tagli).
  resize: "cover" | "contain" = "cover"
): string {
  if (!path) return "";
  // URL esterni (http/https): non trasformabili, ritorna così com'è.
  if (/^https?:\/\//i.test(path)) return path;

  const { width, quality } = PRESETS[preset];
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
      transform: { width, quality, resize },
    });
    return data.publicUrl;
  } catch {
    // Fallback: URL pubblico senza trasformazione (non dovrebbe servire).
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

/** Scorciatoia per il bucket usato dalle foto profilo/galleria. */
export function profileImageUrl(
  path: string | null | undefined,
  preset: ImagePreset = "grid",
  resize: "cover" | "contain" = "cover"
): string {
  return storageImageUrl("profile-images", path, preset, resize);
}
