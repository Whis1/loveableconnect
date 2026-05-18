# Fix flussi Stripe — crediti, abbonamenti, regali, webhook

Obiettivo: quando un utente paga, deve ricevere immediatamente e in modo affidabile esattamente il servizio acquistato, anche se chiude la pagina dopo il pagamento.

## Stato verificato

- `STRIPE_SECRET_KEY` è già configurata nei secret di Lovable Cloud — punto 10 OK, nessuna azione.
- Il vincolo `purchases.product_type` include già `credits_130`, `credits_220`, `premium_weekly`, `standard_monthly`, `gift_premium_monthly` — punto 8 OK lato DB.

## Cosa cambia (linguaggio semplice)

- L'app verifica che ogni sessione di pagamento appartenga davvero all'utente loggato (no scambio di sessioni).
- Ogni errore di scrittura su crediti/abbonamenti/acquisti viene rilevato e fa fallire l'operazione invece di essere ignorato.
- I crediti vengono accreditati subito al pagamento del pacchetto.
- Gli abbonamenti attivano subito tutti i benefici corretti:
  - **Platino/Standard mensile**: 70 crediti + 40 like al giorno.
  - **Premium settimanale**: 40 crediti + 30 like + 5 chat gratis al giorno (+ trial).
  - **Premium mensile**: illimitato (nessun reset balance, like a 999999, nessun limite chat).
- Un nuovo **webhook Stripe** garantisce l'accredito anche se l'utente non torna alla pagina di success.

## Modifiche per file

### 1. `supabase/functions/purchase-credits/index.ts`
- Mantiene `metadata.user_id` sulla session.
- Aggiunge `payment_intent_data.metadata` con `user_id`, `package_type`, `credits_amount` (per il webhook).
- Verifica l'errore della insert su `purchases` (pending) e fallisce se non riesce.
- Usa **service role** (è già così di fatto perché scrive su `purchases` — già OK; resto invariato).

### 2. `supabase/functions/verify-payment/index.ts`
- Richiede `session.metadata.user_id === user.id` → 403 altrimenti.
- Sostituisce update/insert manuale su `user_credits` con un **upsert atomico** (`onConflict: "user_id"`), sommando `credits_amount` al saldo esistente in modo sicuro (rilettura prima dell'upsert).
- Controlla TUTTI gli errori di `update`/`upsert`/`insert` (purchases, user_credits, credit_transactions) e li propaga.
- Idempotenza già garantita dal check `status === 'completed'`.

### 3. `supabase/functions/subscribe-premium/index.ts`
- Aggiunge `subscription_data.metadata` con `user_id`, `subscription_type`, `tier` (così il webhook su `invoice.paid` futuri può accreditare).
- Verifica errore dell'upsert su `user_credits` (per `stripe_customer_id`).

### 4. `supabase/functions/verify-subscription/index.ts`
- Richiede `session.metadata.user_id === user.id` → 403 altrimenti.
- Converte l'`update` su `user_credits` in **upsert** (`onConflict: "user_id"`), così funziona anche se la riga non esiste.
- Imposta esplicitamente i benefici per tier:
  - weekly: balance=40, daily_likes_remaining=30, daily_free_chats_remaining=5, has_used_weekly_trial=true.
  - monthly standard: balance=70, daily_likes_remaining=40.
  - monthly premium: balance=999999, daily_likes_remaining=999999, daily_free_chats_remaining=999999 (illimitato dove promesso dal frontend).
- Idempotenza: se esiste già `purchases.stripe_session_id === session.id` con `status='completed'`, ritorna success senza riapplicare.
- Controlla tutti gli errori di upsert/insert.

### 5. `supabase/functions/verify-gift-subscription/index.ts`
- Richiede `session.metadata.gift_sender_id === user.id` → 403 altrimenti.
- Upsert (non update) su `user_credits` del destinatario con i benefici Premium mensile illimitati.
- Imposta `premium_tier='premium'` esplicitamente (oggi manca).
- Idempotenza tramite check su `purchases.stripe_session_id`.
- Controlla tutti gli errori.

### 6. Nuova edge function: `supabase/functions/stripe-webhook/index.ts`
- Pubblica (`verify_jwt = false` in `supabase/config.toml`).
- Verifica la firma con `STRIPE_WEBHOOK_SECRET` (nuovo secret da aggiungere).
- Gestisce:
  - **`checkout.session.completed`**:
    - mode `payment` → stessa logica di `verify-payment` (accredita crediti, completa purchase, log transaction).
    - mode `subscription` con `metadata.is_gift === 'true'` → stessa logica di `verify-gift-subscription`.
    - mode `subscription` standard → stessa logica di `verify-subscription`.
  - **`invoice.paid`** (rinnovi futuri):
    - Estende `premium_expires_at` e ricarica i crediti del piano (weekly 40 / standard monthly 70 / premium monthly illimitato).
  - **`customer.subscription.deleted`**:
    - `is_premium=false`, `subscription_type='none'`, `premium_tier='none'`.
- Tutto con **service role** e idempotente su `stripe_session_id` / `stripe_subscription_id`.
- Risale all'utente da `metadata.user_id` (per questo i metadata sono propagati anche su `subscription_data` / `payment_intent_data`).

## Migration DB
- Aggiunta di un indice unico su `purchases.stripe_session_id` per garantire idempotenza robusta:
  ```text
  CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_session_id_key
    ON public.purchases (stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;
  ```
- Nessuna modifica al constraint `product_type` (già completo).

## Configurazione richiesta
- Aggiunta blocco in `supabase/config.toml`:
  ```text
  [functions.stripe-webhook]
  verify_jwt = false
  ```
- Nuovo secret: **`STRIPE_WEBHOOK_SECRET`** (formato `whsec_...`). Sarà richiesto via tool dopo l'approvazione del piano.
- Tu dovrai poi (manualmente su Stripe Dashboard):
  1. Developers → Webhooks → Add endpoint.
  2. URL: `https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/stripe-webhook`.
  3. Eventi: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`.
  4. Copiare il *Signing secret* e incollarlo come `STRIPE_WEBHOOK_SECRET`.

## Ordine di esecuzione
1. Migration: indice unico su `purchases.stripe_session_id`.
2. Modifiche alle 5 edge function esistenti.
3. Creazione `stripe-webhook` + aggiornamento `config.toml`.
4. Richiesta secret `STRIPE_WEBHOOK_SECRET`.
5. Tu configuri l'endpoint su Stripe Dashboard.

## Cosa NON viene toccato
- Front-end (Credits, PurchaseSuccess, PremiumSuccess, gift flow): nessuna modifica — i flussi `verify-*` restano e funzionano come prima, il webhook è la rete di sicurezza.
- Template email, logica di calcolo crediti/like esistente nelle funzioni RPC, prezzi Stripe.