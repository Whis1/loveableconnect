

## Diagnosi vera (finalmente)

Ho trovato la causa reale del loop di caricamento. Non è il bootstrap, non è l'RPC, non sono i crediti. È un problema **di routing**.

In `src/components/AnimatedRoutes.tsx`:
```tsx
<Routes location={location} key={location.pathname}>
```

Il `key={location.pathname}` significa: **ogni volta che cambia la URL, AnimatePresence smonta e rimonta TUTTA la pagina**.

Cosa succede oggi quando l'utente clicca "Conferma":
1. `ProfileGridCard` → `navigate('/chat/new/:otherUserId')` → Chat si monta
2. `initChat` chiama l'RPC, ottiene `matchId`, fa `window.history.replaceState('/chat/:matchId')` per "evitare il rimount"
3. **Ma `replaceState` NON aggiorna `location.pathname` di React Router** → React Router pensa ancora di essere su `/chat/new/:otherUserId`
4. Le query partono, completano, settano `otherUser`, `messages`, etc.
5. **Problema**: qualunque cosa successivamente provochi un re-render dei `Routes` con la `location` aggiornata (focus, hot reload, qualsiasi `useLocation` che cambia, o un secondo navigate) fa scattare il rimount → tutto lo stato della chat viene buttato → ricomincia da zero → loop.
6. Inoltre, se la sessione auth fa un refresh durante il bootstrap, `initChat` può vedere risultati inconsistenti.

A peggiorare: oggi `Chat.tsx` ha 2 effetti collegati a `matchId`/`otherUserId` (riga 228 e 232) e il componente esiste sia come `/chat/new/:otherUserId` che `/chat/:matchId` — due route distinte → garantito un rimount appena qualcosa "sincronizza" la URL.

## Piano: ricominciare da zero, super semplice

Obiettivo dichiarato dall'utente:
> "Un pulsante che se cliccato scala quei tot crediti e reindirizza alla chat con quel profilo per poter chattare."

### 1. Spostare la creazione del match PRIMA della navigazione
In `src/components/ProfileGridCard.tsx`, dentro `handleConfirmChat`:
- Mostrare un piccolo spinner sul bottone Conferma (max 1-2s)
- Chiamare `supabase.rpc('get_or_create_direct_chat', { _other_user_id: profile.id })` — ritorna subito `match_id`
- Chiamare in background `consume_free_chat` o `deduct_credits` (non bloccante)
- `navigate('/chat/<match_id>')` — **direttamente con il vero matchId**, senza passare da `/chat/new/...`
- Eliminato totalmente lo step "redirect, poi risolvi, poi sostituisci URL"

Risultato: la pagina Chat si monta UNA volta, con il `matchId` corretto già nei params. Niente `replaceState`, niente rimount.

### 2. Semplificare `src/pages/Chat.tsx`
- Rimuovere tutto il path `/chat/new/:otherUserId`: la pagina si occupa SOLO di una chat con `matchId` già esistente
- Rimuovere `resolveOrCreateDirectChat`, `resolveDirectChatSettlement`, `settleDirectChatCost`, `withTimeout` — non servono più qui
- `initChat` diventa lineare e veloce:
  1. `supabase.auth.getSession()` (con guard se manca)
  2. `Promise.all`: profilo altro utente + status block + ultimi 200 messaggi + avatar mio
  3. Set state, `setLoading(false)`
  4. Subscribe realtime
- Niente `window.history.replaceState`, niente settlement in background dentro Chat
- Effect dipende SOLO da `matchId`

### 3. Aggiornare il route
In `src/components/AnimatedRoutes.tsx`:
- Rimuovere la route `'/chat/new/:otherUserId'`
- Lasciare solo `'/chat/:matchId'`
- (Lasciamo il `key={location.pathname}` perché ora la URL non cambia più dopo il mount)

### 4. Gestione errori chiara
Se l'RPC fallisce o crediti insufficienti, l'utente RESTA sulla card con un toast — non viene mai mandato in una chat "vuota in caricamento".

## File coinvolti
- `src/components/ProfileGridCard.tsx` — `handleConfirmChat` esegue RPC + deduct, poi naviga
- `src/pages/Chat.tsx` — semplificare, una sola modalità (matchId)
- `src/components/AnimatedRoutes.tsx` — rimuovere route `/chat/new/...`

## Perché stavolta funziona
- La pagina Chat si monta una volta sola, con il matchId reale
- Niente trucchi `replaceState` che confondono React Router
- Niente effetti che si rieseguono per dipendenze instabili
- Il "caricamento infinito" sparisce perché non c'è più niente da risolvere lato Chat: il match esiste già quando arrivi

