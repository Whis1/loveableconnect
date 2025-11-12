-- Tabella per i template email personalizzabili
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  default_html_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: solo admin possono vedere i template
CREATE POLICY "Admin can view email templates"
ON public.email_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: solo admin possono modificare i template
CREATE POLICY "Admin can update email templates"
ON public.email_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserisci i template di default
INSERT INTO public.email_templates (template_key, template_name, description, subject, html_content, default_html_content) VALUES
(
  'like_notification',
  'Notifica Like Ricevuto',
  'Email inviata quando un utente riceve un like',
  'Hai ricevuto un nuovo like! ❤️',
  '<h1>Nuovo Like!</h1><p>Ciao! Hai ricevuto un like da {{likerNickname}}.</p><p>Accedi ora per vedere chi ti ha messo like!</p><a href="https://loveable.app/likes">Vai ai tuoi Like</a>',
  '<h1>Nuovo Like!</h1><p>Ciao! Hai ricevuto un like da {{likerNickname}}.</p><p>Accedi ora per vedere chi ti ha messo like!</p><a href="https://loveable.app/likes">Vai ai tuoi Like</a>'
),
(
  'message_notification',
  'Notifica Nuovo Messaggio',
  'Email inviata quando un utente riceve un messaggio',
  'Nuovo messaggio da {{senderNickname}} 💬',
  '<h1>Nuovo Messaggio!</h1><p>Hai ricevuto un messaggio da {{senderNickname}}.</p><p>{{messagePreview}}</p><a href="https://loveable.app/chats">Leggi il messaggio</a>',
  '<h1>Nuovo Messaggio!</h1><p>Hai ricevuto un messaggio da {{senderNickname}}.</p><p>{{messagePreview}}</p><a href="https://loveable.app/chats">Leggi il messaggio</a>'
),
(
  'purchase_credits',
  'Conferma Acquisto Crediti',
  'Email di conferma dopo l''acquisto di crediti',
  'Grazie per il tuo acquisto! 🎉',
  '<h1>Acquisto Completato</h1><p>Hai acquistato {{creditsAmount}} crediti per €{{amountPaid}}.</p><p>Il tuo nuovo saldo è {{newBalance}} crediti.</p><a href="https://loveable.app/credits">Visualizza crediti</a>',
  '<h1>Acquisto Completato</h1><p>Hai acquistato {{creditsAmount}} crediti per €{{amountPaid}}.</p><p>Il tuo nuovo saldo è {{newBalance}} crediti.</p><a href="https://loveable.app/credits">Visualizza crediti</a>'
),
(
  'reset_password',
  'Reset Password',
  'Email per reimpostare la password',
  'Reimposta la tua password 🔐',
  '<h1>Reset Password</h1><p>Clicca sul link per reimpostare la tua password:</p><a href="{{resetLink}}">Reimposta Password</a>',
  '<h1>Reset Password</h1><p>Clicca sul link per reimpostare la tua password:</p><a href="{{resetLink}}">Reimposta Password</a>'
),
(
  'subscription_expired',
  'Abbonamento Scaduto',
  'Email inviata quando l''abbonamento scade',
  'Il tuo abbonamento è scaduto 😢',
  '<h1>Abbonamento Scaduto</h1><p>Il tuo abbonamento {{subscriptionType}} è scaduto.</p><p>Rinnova ora per continuare a godere dei vantaggi premium!</p><a href="https://loveable.app/credits">Rinnova Abbonamento</a>',
  '<h1>Abbonamento Scaduto</h1><p>Il tuo abbonamento {{subscriptionType}} è scaduto.</p><p>Rinnova ora per continuare a godere dei vantaggi premium!</p><a href="https://loveable.app/credits">Rinnova Abbonamento</a>'
),
(
  'subscription_expiring',
  'Abbonamento in Scadenza',
  'Email inviata quando l''abbonamento sta per scadere',
  'Il tuo abbonamento scade tra {{daysRemaining}} giorni ⏰',
  '<h1>Abbonamento in Scadenza</h1><p>Il tuo abbonamento {{subscriptionType}} scadrà il {{expiresAt}}.</p><p>Rinnova ora per non perdere i vantaggi!</p><a href="https://loveable.app/credits">Rinnova Abbonamento</a>',
  '<h1>Abbonamento in Scadenza</h1><p>Il tuo abbonamento {{subscriptionType}} scadrà il {{expiresAt}}.</p><p>Rinnova ora per non perdere i vantaggi!</p><a href="https://loveable.app/credits">Rinnova Abbonamento</a>'
),
(
  'subscription_purchased',
  'Abbonamento Acquistato',
  'Email di conferma acquisto abbonamento',
  'Benvenuto in Premium! 🌟',
  '<h1>Abbonamento Attivato</h1><p>Il tuo abbonamento {{subscriptionType}} {{tier}} è ora attivo!</p><p>Scadenza: {{expiresAt}}</p><h2>I tuoi vantaggi:</h2><ul>{{benefits}}</ul><a href="https://loveable.app">Inizia ad usare</a>',
  '<h1>Abbonamento Attivato</h1><p>Il tuo abbonamento {{subscriptionType}} {{tier}} è ora attivo!</p><p>Scadenza: {{expiresAt}}</p><h2>I tuoi vantaggi:</h2><ul>{{benefits}}</ul><a href="https://loveable.app">Inizia ad usare</a>'
),
(
  'subscription_renewed',
  'Abbonamento Rinnovato',
  'Email di conferma rinnovo abbonamento',
  'Il tuo abbonamento è stato rinnovato! 🎉',
  '<h1>Abbonamento Rinnovato</h1><p>Il tuo abbonamento {{subscriptionType}} {{tier}} è stato rinnovato con successo!</p><p>Nuova scadenza: {{expiresAt}}</p><a href="https://loveable.app">Continua ad usare</a>',
  '<h1>Abbonamento Rinnovato</h1><p>Il tuo abbonamento {{subscriptionType}} {{tier}} è stato rinnovato con successo!</p><p>Nuova scadenza: {{expiresAt}}</p><a href="https://loveable.app">Continua ad usare</a>'
),
(
  'confirmation_email',
  'Email di Conferma',
  'Email di conferma registrazione',
  'Benvenuto su LoveableConnect! 💕',
  '<h1>Benvenuto!</h1><p>Grazie per esserti registrato su LoveableConnect.</p><p>Conferma la tua email cliccando sul link:</p><a href="{{confirmLink}}">Conferma Email</a>',
  '<h1>Benvenuto!</h1><p>Grazie per esserti registrato su LoveableConnect.</p><p>Conferma la tua email cliccando sul link:</p><a href="{{confirmLink}}">Conferma Email</a>'
),
(
  'support_email',
  'Email Supporto',
  'Email inviata al team di supporto',
  'Nuovo messaggio di supporto da {{userEmail}}',
  '<h1>Nuovo Messaggio Supporto</h1><p>Da: {{userEmail}}</p><p>Messaggio:</p><p>{{message}}</p>',
  '<h1>Nuovo Messaggio Supporto</h1><p>Da: {{userEmail}}</p><p>Messaggio:</p><p>{{message}}</p>'
),
(
  'gift_subscription',
  'Regalo Abbonamento',
  'Email inviata al destinatario di un regalo',
  '🎁 Hai ricevuto un regalo Premium!',
  '<h1>Hai ricevuto un Regalo!</h1><p>{{senderNickname}} ti ha regalato un abbonamento Premium!</p><p>Scadenza: {{expiresAt}}</p><h2>I tuoi vantaggi:</h2><ul>{{benefits}}</ul><a href="https://loveable.app">Inizia ad usare</a>',
  '<h1>Hai ricevuto un Regalo!</h1><p>{{senderNickname}} ti ha regalato un abbonamento Premium!</p><p>Scadenza: {{expiresAt}}</p><h2>I tuoi vantaggi:</h2><ul>{{benefits}}</ul><a href="https://loveable.app">Inizia ad usare</a>'
),
(
  'unlock_payment',
  'Sblocco Pagamento Like',
  'Email di conferma sblocco like 24h',
  'Sblocco Like attivato! 🔓',
  '<h1>Sblocco Like Attivato</h1><p>Hai sbloccato i like illimitati per 24 ore!</p><p>Valido fino a: {{expiresAt}}</p><a href="https://loveable.app/explore">Inizia a dare like</a>',
  '<h1>Sblocco Like Attivato</h1><p>Hai sbloccato i like illimitati per 24 ore!</p><p>Valido fino a: {{expiresAt}}</p><a href="https://loveable.app/explore">Inizia a dare like</a>'
);