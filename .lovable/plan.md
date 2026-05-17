# Hardening sicurezza flussi Stripe

Obiettivo: rendere i pagamenti e gli abbonamenti affidabili e a prova di manomissione, e garantire l'accredito anche se l'utente non torna alla pagina di success.

## Cosa cambia (in breve, non tecnico)

- Quando un utente paga, l'app verifica che la sessione di pagamento appartenga **davvero** a lui (no furti di sessione).
- I crediti e gli abbonamenti vengono accreditati anche se l'utente chiude la pagina dopo il pagamento, grazie a un **webhook Stripe**.
- Errori di scrittura sul database non vengono più ignorati: se qualcosa non va, l'operazione fallisce in modo visibile.
- Quando si attiva un abbonamento, il record dei crediti utente viene **creato se manca** (upsert).
- I metadati `user_id` vengono salvati anche sul `PaymentIntent` e sulla `Subscription` (non solo sulla Session), così il webhook può sempre risalire all'utente.
- Il vincolo sui tipi di prodotto in `purchases` è già corretto: nessuna migrazione necessaria per quel punto.

## Modifiche per file

### 1. `purchase-credits/index.ts`
- Aggiungere `metadata` anche su `payment_intent_data` (oltre alla session).
- Verificare l'`error` di insert sulla riga `purchases` e fallire se presente.
- Mantenere `user_id`, `package_type`, `credits_amount` nei metadata della session.

### 2. `verify-payment/index.ts`
- Recuperare la session ed esigere `session.metadata.user_id === user.id` (oltre al filtro `eq("user_id", user.id)` sulla query). Se non combacia → 403.
- Controllare gli errori di `update` su `purchases` e `update/insert` su `user_credits` e `credit_transactions`.
- Sostituire il blocco update-or-insert su `user_credits` con un **upsert** atomico.

### 3. `subscribe-premium/index.ts`
- Aggiungere `subscription_data.metadata` con `user_id`, `subscription_type`, `tier`, così il webhook può accreditare via `invoice.paid` futuri.
- Controllare l'errore dell'`upsert` su `user_credits` (per `stripe_customer_id`).

### 4. `verify-subscription/index.ts`
- Esigere `session.metadata.user_id === user.id` → 403 se non combacia.
- Convertire l'`update` su `user_credits` in **upsert** (`onConflict: "user_id"`) per coprire utenti senza riga preesistente.
- Verificare errori su `upsert` e `insert` (`purchases`).
- Idempotenza: se esiste già un `purchases` con `stripe_session_id` = session.id e `status = 'completed'`, ritornare success senza riapplicare.

### 5. `verify-gift-subscription/index.ts`
- Esigere che `session.metadata.gift_sender_id === user.id` (il chiamante deve essere il mittente del regalo).
- Idempotenza come sopra (controllo su `purchases.stripe_session_id`).
- Verificare errori su `update`/`insert`.

### 6. Nuovo: `stripe-webhook/index.ts`
- Edge function pubblica (`verify_jwt = false` via `supabase/config.toml`).
- Verifica firma con `STRIPE_WEBHOOK_SECRET` (nuovo secret da aggiungere).
- Gestisce gli eventi:
  - `checkout.session.completed` → per `mode = payment` accredita i crediti (stessa logica di `verify-payment`); per `mode = subscription` attiva il premium o il gift (stessa logica di `verify-subscription` / `verify-gift-subscription`).
  - `invoice.paid` → ad ogni rinnovo abbonamento estende `premium_expires_at` e ricarica i crediti del piano (weekly: 40, standard monthly: 70; premium monthly: illimitato → nessun reset balance).
  - `customer.subscription.deleted` → segna `is_premium = false`, `subscription_type = 'none'`.
- Tutta la scrittura usa **service role**, tutta la logica è **idempotente** via `stripe_session_id` / `stripe_subscription_id`.
- Risale all'utente leggendo `metadata.user_id` da session/subscription (per questo serve il punto sui metadata propagati).

## Dettagli tecnici

### Nuovo secret richiesto
- `STRIPE_WEBHOOK_SECRET` (firma webhook Stripe — formato `whsec_...`). Sarà aggiunto via `add_secret` dopo l'approvazione.

### Configurazione lato Stripe (passi manuali per te dopo il deploy)
1. Dashboard Stripe → Developers → Webhooks → Add endpoint.
2. URL: `https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/stripe-webhook`.
3. Eventi: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`.
4. Copia il *Signing secret* e incollalo come `STRIPE_WEBHOOK_SECRET`.

### Migration database
- Nessuna migration necessaria sui constraint (già allineati). Solo eventuale aggiunta di un indice unico su `purchases.stripe_session_id` per garantire idempotenza pulita:
  ```text
  CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_session_id_key
    ON public.purchases (stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;
  ```

### Configurazione `supabase/config.toml`
- Aggiungere blocco per la nuova funzione:
  ```text
  [functions.stripe-webhook]
  verify_jwt = false
  ```

## Ordine di esecuzione
1. Migration: indice unico su `purchases.stripe_session_id`.
2. Modifiche alle 5 edge function esistenti.
3. Creazione `stripe-webhook` + aggiornamento `config.toml`.
4. Richiesta del secret `STRIPE_WEBHOOK_SECRET`.
5. Tu configuri l'endpoint webhook su Stripe Dashboard e incolli il secret.

## Cosa NON viene toccato
- Logica di calcolo crediti/like/chat per piano (resta come oggi).
- Template email (continuano a funzionare).
- Front-end (Credits, PremiumSuccess, PurchaseSuccess, gift): nessuna modifica necessaria — la verify-* resta come fallback "veloce" lato client, il webhook è la rete di sicurezza.