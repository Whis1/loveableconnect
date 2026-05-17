// Legge in modo sincrono l'id utente dalla sessione Supabase salvata in
// localStorage, senza chiamate di rete. Serve a mostrare subito le pagine
// senza aspettare getSession(), che a volte si blocca.
export function getStoredUserId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user ?? parsed?.currentSession?.user;
      if (user?.id) return user.id as string;
    }
  } catch {
    /* localStorage non disponibile o contenuto non valido */
  }
  return null;
}
