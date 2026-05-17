// Legge in modo sincrono l'id utente dalla sessione Supabase salvata in
// localStorage, senza chiamate di rete. Serve a mostrare subito le pagine
// senza aspettare getSession(), che a volte si blocca.
export function getStoredUserId(): string | null {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
    const candidates: string[] = [];
    if (projectId) candidates.push(`sb-${projectId}-auth-token`);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token") && !candidates.includes(k)) {
        candidates.push(k);
      }
    }
    for (const key of candidates) {
      let raw = localStorage.getItem(key);
      if (!raw) continue;
      if (raw.startsWith("base64-")) {
        try {
          raw = atob(raw.slice(7));
        } catch {
          /* contenuto non in base64 */
        }
      }
      const parsed = JSON.parse(raw);
      const user = parsed?.user ?? parsed?.currentSession?.user ?? parsed?.[0]?.user;
      if (user?.id) return user.id as string;
    }
  } catch {
    /* localStorage non disponibile o contenuto non valido */
  }
  return null;
}
