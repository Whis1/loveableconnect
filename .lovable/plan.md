

## Diagnosi del Problema "Mi Piace Non Funziona"

### Causa Root
Il like viene inserito tramite la edge function `admin-manage-like` che usa il service role. I log mostrano che **la funzione non ha nessun log recente** -- il che significa che o non viene chiamata correttamente o fallisce silenziosamente.

Il problema principale è architetturale: il codice in `ProfileGridCard.tsx` (linee 256-312) lancia l'inserimento del like in una **IIFE asincrona fire-and-forget** `(async () => { ... })()`. Se `supabase.functions.invoke` fallisce (es. funzione non raggiungibile, timeout, errore di rete), l'errore viene catturato e il like viene annullato visivamente con `setHasLiked(false)` -- ma l'utente potrebbe non notare il toast di errore se è già navigato altrove.

### Soluzione: Inserimento Diretto nel DB (Elimina l'Edge Function)

Non serve la edge function `admin-manage-like` per i like degli utenti normali. La tabella `likes` ha già le RLS policy corrette:
- **INSERT**: `auth.uid() = from_user_id` ✅
- **SELECT**: `auth.uid() = from_user_id OR auth.uid() = to_user_id` ✅
- **DELETE**: `auth.uid() = from_user_id` ✅

Il trigger `check_and_create_match` gestisce automaticamente i match reciproci.

### Modifiche

**1. `src/components/ProfileGridCard.tsx` - Sostituire edge function con insert diretto**
- Nella sezione "Like giornalieri" (linee 276-302), dopo `consumeLike`, sostituire `supabase.functions.invoke('admin-manage-like', ...)` con:
  ```typescript
  const { error: insertError } = await supabase
    .from("likes")
    .insert({ from_user_id: currentUserId, to_user_id: profile.id });
  ```
- Gestire `23505` (duplicate) come non-errore
- Invalidare la query `["user-likes"]` dopo il successo per aggiornare il cache
- Rendere il flusso **sincrono** (await prima di procedere) invece di fire-and-forget

**2. `src/pages/Likes.tsx` - Stessa correzione per "like back"**
- Sostituire la chiamata a `admin-manage-like` con insert diretto nella tabella `likes`

**3. `src/hooks/useLikes.ts` - Invalidare cache dopo insert**
- Aggiungere invalidazione della query dopo ogni like riuscito

### Note
- La edge function `admin-manage-like` resta per uso admin (`ProfileManager.tsx`) dove serve il service role
- I like degli utenti normali usano direttamente il client SDK con RLS -- più veloce e affidabile

