<final-text>Obiettivo: rendere il like davvero persistente e coerente su Explore, Search e Likes.

1. Diagnosi reale
- Non sembra un problema di permessi sulla tabella `likes`: le policy sono già corrette.
- Il problema è nel flusso client:
  - `ProfileGridCard` mostra il like subito, prima che il salvataggio sia davvero finito;
  - lì il like richiede più chiamate consecutive (`controllo match` -> `consumeLike` -> `insert`);
  - `Search` e `Likes` usano logiche diverse e non scalano i like giornalieri in modo coerente.
- Se ricarichi subito, la richiesta può interrompersi: per questo il cuore appare, ma al refresh il like sparisce. Se aspetti, la richiesta finisce e poi compare.

2. Unificare il salvataggio in una sola operazione atomica
- Creare una nuova funzione backend, ad esempio `send_like(_to_user_id uuid, _use_credits boolean default false)`.
- La funzione deve:
  - usare `auth.uid()` e non un `user_id` passato dal client;
  - gestire like già esistente in modo idempotente;
  - consumare il like giornaliero oppure i crediti nello stesso flusso;
  - inserire il like;
  - restituire `success`, `already_exists`, `match_created`, `likes_remaining`, `credits_used`, `new_balance`.
- Così il like non dipende più da 2-3 richieste separate lato frontend.

3. Rendere il click persistente anche con refresh immediato
- Aggiungere un piccolo outbox locale dei like pendenti (localStorage), salvato subito al click.
- Se la pagina viene ricaricata mentre il like è ancora in invio:
  - il bottone non deve ricomparire come se nulla fosse;
  - il like pendente va riprovato automaticamente al caricamento successivo.
- Questo elimina l’effetto “lo vedo messo, ma al refresh sparisce”.

4. Usare un solo hook per tutti i like
- Estrarre la logica in un hook condiviso, ad esempio `useSendLike`.
- Il hook gestirà:
  - chiamata alla funzione backend;
  - stato `pending`/`confirmed`;
  - aggiornamento cache React Query (`user-likes`, `daily-likes`, `user-credits`, `matches`);
  - replay dei like pendenti dopo reload.
- `ProfileGridCard`, `Search` e `Likes` smetteranno di avere logiche diverse.

5. Correggere i punti incoerenti
- `src/components/ProfileGridCard.tsx`
  - togliere il falso “like riuscito” prima della conferma server;
  - mostrare invece stato di invio/disabilitato;
  - usare il risultato backend per match/banner/contatori.
- `src/pages/Search.tsx`
  - sostituire l’`insert` diretto con il nuovo hook condiviso;
  - far scalare davvero i like giornalieri.
- `src/pages/Likes.tsx`
  - usare lo stesso hook anche per “Like back”.
- `src/hooks/useDailyLikes.ts` e `src/hooks/useCredits.ts`
  - invalidazione immediata post-successo;
  - query key legate all’utente per evitare stati sporchi.

6. Verifica finale
- Testare:
  1. click like e refresh immediato;
  2. click like e refresh dopo pochi secondi;
  3. click like da Explore, Search e Likes.
- Confermare che:
  - il like resta salvato dopo reload;
  - il contatore like giornalieri scala subito;
  - il match reciproco continua a funzionare.

Dettagli tecnici
- Il bug principale non è il bottone in sé, ma la combinazione di:
  - UI ottimistica troppo anticipata;
  - flussi diversi nelle varie pagine;
  - operazioni non atomiche;
  - nessuna persistenza locale per richieste in volo.
- La correzione giusta è centralizzare il “send like” in un unico flusso affidabile end-to-end.</final-text>