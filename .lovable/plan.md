
Obiettivo: fare in modo che il click su “Conferma” apra una chat davvero utilizzabile subito, non solo la route.

Diagnosi
- Il problema non è più il bottone del pannello: la navigazione ora parte.
- Il blocco vero è in `src/pages/Chat.tsx`: la pagina entra nella chat, ma resta in stato pending/skeleton troppo a lungo.
- Oggi il bootstrap della chat è ancora troppo pesante e seriale:
  1. recupero sessione
  2. resolve/create match
  3. controllo costi chat
  4. fetch match
  5. fetch profilo
  6. check block
  7. fetch messaggi
  8. solo alla fine la UI viene sbloccata
- C’è anche un problema strutturale nell’effect principale della chat: dipende da `refetchCredits`, che arriva da `useCredits()` come funzione ricreata a ogni render. Questo può far ripartire l’init più volte, cancellare run precedenti e lasciare la chat bloccata in caricamento.
- Lo screenshot conferma proprio questo stato: route aperta, shell visibile, ma composer ancora “pending”.

Implementazione
1. Stabilizzare l’inizializzazione della chat
- In `src/pages/Chat.tsx`, correggere l’effect di bootstrap per evitare riesecuzioni inutili.
- Togliere la dipendenza instabile `refetchCredits` dall’effect principale.
- Aggiungere un guard per impedire init concorrenti sullo stesso mount.

2. Separare “chat pronta” da “storico in caricamento”
- Sostituire l’attuale `loading` unico con stati separati, ad esempio:
  - `isResolvingRoom`
  - `isLoadingHistory`
- La chat deve diventare scrivibile appena abbiamo:
  - utente corrente
  - `matchId`
  - profilo dell’altro utente
- Lo storico messaggi può continuare a caricarsi in background senza bloccare input e azioni.

3. Togliere il costo chat dal percorso critico
- In `src/pages/Chat.tsx`, `resolveOrCreateDirectChat()` deve limitarsi a ottenere/creare il match rapidamente.
- Spostare il settlement dei costi fuori dal critical path:
  - precheck leggero nel pannello usando i dati già presenti (`credits`, `chatsRemaining`)
  - riconciliazione backend in background dopo che la chat è pronta
- Così “Conferma” non resta ostaggio di RPC extra prima di rendere utilizzabile la chat.

4. Ridurre le query seriali all’avvio
- Dopo avere il `matchId`, caricare in parallelo:
  - profilo dell’altro utente
  - stato blocco
  - cronologia messaggi
  - avatar utente corrente
- Impostare subito `currentUser`, `otherUser` e `activeMatchId`, poi abilitare immediatamente il composer.

5. Rafforzare il ripristino sessione
- Applicare alla chat lo stesso pattern già usato in `Auth.tsx` / `Index.tsx`: aspettare che la sessione sia realmente pronta prima di far partire query sensibili.
- Questo evita casi in cui la route chat parte ma le query si agganciano a uno stato auth non ancora stabilizzato.

6. Rifinire il flusso dal pannello conferma
- In `src/components/ProfileGridCard.tsx`, lasciare la conferma super leggera:
  - chiusura immediata del pannello
  - navigazione immediata
  - nessun loading bloccante rimasto appeso lato card/modale

QA
- Verificare questi casi:
  - profilo senza match -> Chat -> Conferma -> chat subito scrivibile
  - profilo con match esistente -> apertura immediata
  - reload diretto su `/chat/:matchId` -> nessun pending infinito
- Confermare anche che:
  - non partano init multipli
  - i messaggi realtime funzionino
  - crediti/free chat vengano aggiornati senza bloccare la UI

File coinvolti
- `src/pages/Chat.tsx` — fix principale
- `src/components/ProfileGridCard.tsx` — conferma/navigazione pulita
- opzionale: `src/hooks/useCredits.ts` — rendere stabile `refetch` oppure non usarlo nel bootstrap chat

Dettaglio tecnico chiave
- Il problema ora non è “aprire la route”, ma “la route entra e resta prigioniera del bootstrap”.
- La causa più forte, leggendo il codice attuale, è questa combinazione:
  - bootstrap troppo lungo e seriale;
  - effect della chat che può rieseguirsi continuamente per una dipendenza instabile.
- La correzione giusta è rendere la chat usable-first: prima stanza pronta e input attivo, poi storico/costi/sync in background.
