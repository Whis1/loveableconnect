# 🔔 Sistema di Notifiche Push & Email - Arrettu

## 📧 Sistema Email Personalizzate

### Email di Reset Password

L'app ora utilizza email personalizzate per il reset password con:
- 🎨 Design personalizzato a tema Arrettu
- ⏰ Token valido per 2 ore (invece di 1 ora standard)
- 💌 Template HTML responsive e professionale

**Configurazione:**

1. **Email Template già pronta**: `supabase/functions/send-reset-password-email/index.ts`
2. **Da configurare nel Dashboard Supabase**:
   - Vai su Authentication → Email Templates → "Password Recovery"
   - Imposta:
     - Enable Custom SMTP: OFF
     - Use Edge Function: ON
     - Edge Function URL: `https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/send-reset-password-email`

3. **Aumenta il token expiry**:
   - Dashboard Supabase → Authentication → URL Configuration
   - "Mailer URL paths" → imposta expiry a 7200 secondi

### Email di Conferma Account

Email personalizzata già configurata con tema Arrettu! 💘

---

## 🔔 Sistema di Notifiche Push

Il sistema di notifiche push è completamente implementato e pronto all'uso! Gli utenti riceveranno notifiche istantanee per:

- 💬 **Nuovi messaggi** dai loro match
- ❤️ **Likes ricevuti** sul profilo
- 🎉 **Nuovi match** trovati

Le notifiche funzionano su **desktop e mobile**, anche quando il browser è chiuso!

## Panoramica Push Notifications

### 1. Database ✅
- **push_subscriptions**: Memorizza le sottoscrizioni degli utenti
- **notification_queue**: Coda delle notifiche da inviare
- **Trigger automatici**: Creano notifiche per messaggi, likes e match

### 2. Service Worker ✅
- **Gestione notifiche in background** (`public/sw.js`)
- Click handler per aprire l'app nel punto giusto
- Supporto per icone e badge personalizzati

### 3. Frontend ✅
- **NotificationPermissionBanner**: Banner elegante per richiedere permesso (Dashboard)
- **NotificationSettings**: Gestione completa nelle impostazioni profilo
- **usePushNotifications**: Hook per gestire subscriptions

### 4. Backend ✅
- **send-push-notification**: Edge function per processare la coda ed inviare notifiche
- Gestione automatica di subscriptions invalide
- Supporto per batch processing

## ⚙️ Setup Necessario (5 minuti)

### Passo 1: Genera VAPID Keys

Le VAPID keys servono per autenticare le notifiche push. Eseguire:

\`\`\`bash
npx web-push generate-vapid-keys
\`\`\`

Output simile a:
\`\`\`
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
uGGYwdDXl-sBWaXLU95y-jgQBt7gHa5g5TJTSPHjRcc

=======================================
\`\`\`

### Passo 2: Configura le Keys

1. **Nel codice** - Sostituisci la Public Key:
   - File: `src/hooks/usePushNotifications.ts` (linea ~79)
   - Sostituisci il valore di `vapidPublicKey` con la tua Public Key

2. **Nei secrets Supabase**:
   - Vai su Supabase Dashboard → Settings → Secrets
   - Aggiungi `VAPID_PRIVATE_KEY` con la tua Private Key

3. **Nell'edge function**:
   - File: `supabase/functions/send-push-notification/index.ts` (linea ~11)
   - Aggiorna `VAPID_PRIVATE_KEY` per leggere dal secret

### Passo 3: Abilita Cron Job (Opzionale ma Consigliato)

Per processare automaticamente le notifiche ogni minuto:

\`\`\`sql
SELECT cron.schedule(
  'process-push-notifications',
  '* * * * *', -- Ogni minuto
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
\`\`\`

**Sostituisci:**
- `YOUR_PROJECT_REF` con il tuo project ref Supabase
- `YOUR_ANON_KEY` con la tua anon key

## 🎯 Come Funziona

### Flusso Automatico

1. **Evento** (messaggio/like/match) → Trigger database
2. **Notifica** inserita in `notification_queue`
3. **Edge Function** processa la coda (manuale o cron)
4. **Push inviato** a tutti i device dell'utente
5. **Utente riceve** notifica anche offline!

### Per Testare

1. Vai su Dashboard
2. Clicca "Attiva Notifiche" nel banner
3. Accetta il permesso browser
4. Invia un messaggio di test da un altro account
5. Riceverai la notifica! 🎉

## 📱 Compatibilità

- ✅ **Desktop**: Chrome, Firefox, Edge, Safari (macOS 13+)
- ✅ **Mobile**: Chrome Android, Safari iOS (16.4+)
- ✅ **Funziona offline** con Service Worker
- ✅ **No cookie banner** (il browser gestisce il consenso)

## 🔒 Sicurezza

- **RLS Policies** su tutte le tabelle
- **VAPID authentication** per le notifiche
- **Service Role Key** solo server-side
- **Subscriptions** legate all'utente autenticato

## 🛠️ Manutenzione

### Log dell'Edge Function

Per verificare che le notifiche vengano inviate:

\`\`\`bash
supabase functions logs send-push-notification
\`\`\`

### Testare Manualmente

Per processare la coda manualmente (senza cron):

\`\`\`bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json"
\`\`\`

### Query Utili

\`\`\`sql
-- Vedere notifiche in coda
SELECT * FROM notification_queue WHERE sent = false;

-- Vedere subscriptions attive
SELECT user_id, COUNT(*) as devices 
FROM push_subscriptions 
GROUP BY user_id;

-- Vedere statistiche invii
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE sent = true) as sent
FROM notification_queue
GROUP BY type;
\`\`\`

## 🎨 Personalizzazione

### Modificare il contenuto delle notifiche

Edita le funzioni in `supabase/migrations/`:
- `notify_new_message()` - Per messaggi
- `notify_new_like()` - Per likes  
- `notify_new_match()` - Per match

### Aggiungere nuovi tipi di notifiche

1. Aggiungi tipo in check constraint:
\`\`\`sql
ALTER TABLE notification_queue 
DROP CONSTRAINT notification_queue_type_check;

ALTER TABLE notification_queue 
ADD CONSTRAINT notification_queue_type_check 
CHECK (type IN ('message', 'like', 'match', 'premium_expiring'));
\`\`\`

2. Crea trigger per il nuovo evento
3. Aggiorna frontend per gestire il nuovo tipo

## 🆘 Troubleshooting

### Le notifiche non arrivano?

1. Verifica che il Service Worker sia registrato:
   - Apri DevTools → Application → Service Workers
   - Dovrebbe esserci \`/sw.js\` attivo

2. Controlla permessi browser:
   - Settings → Impostazioni notifiche
   - Arrettu deve essere "Allow"

3. Verifica VAPID keys:
   - Keys devono corrispondere tra frontend e backend
   - Private key deve essere in Supabase secrets

4. Controlla la coda:
\`\`\`sql
SELECT * FROM notification_queue WHERE sent = false;
\`\`\`

### Browser non supportato?

Safari iOS richiede versione 16.4+ e deve essere aggiunto alla home screen.

---

## 💡 Note Importanti

- **VAPID Keys**: Genera sempre le TUE chiavi, non usare quelle di esempio!
- **Production**: Usa un servizio come OneSignal o Firebase per scalare meglio
- **Testing**: Usa sempre HTTPS (o localhost) per push notifications
- **Privacy**: Gli utenti possono disattivare le notifiche in qualsiasi momento

---

🎉 **Sistema pronto all'uso!** Basta configurare le VAPID keys e tutto funzionerà automaticamente!