-- Inserisci template email per scadenza abbonamento
INSERT INTO email_templates (template_key, template_name, description, subject, html_content, default_html_content)
VALUES (
  'subscription_expiring',
  'Abbonamento in Scadenza',
  'Email inviata quando l''abbonamento sta per scadere',
  '⏰ Il tuo abbonamento LoveableConnect sta per scadere',
  '<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>LoveableConnect - Abbonamento in Scadenza</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #fff5f8;
      color: #333;
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 500px;
      margin: auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 30px;
      text-align: center;
    }
    .logo {
      display: block;
      margin: 0 auto 20px auto;
      width: 140px;
      border-radius: 12px;
    }
    h1 {
      color: #e6397d;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 14px 28px;
      background-color: #e6397d;
      color: #fff;
      text-decoration: none;
      font-weight: bold;
      border-radius: 8px;
      transition: background-color 0.3s ease;
    }
    .btn:hover {
      background-color: #c02765;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://i.imgur.com/L9g9qMA.png" alt="LoveableConnect Logo" class="logo">
    
    <h1>⏰ Il tuo abbonamento sta per scadere!</h1>
    <p>Ciao! Il tuo abbonamento <strong>{{subscriptionType}}</strong> su LoveableConnect scadrà tra <strong>{{daysRemaining}} giorni</strong>.</p>
    <p>Data di scadenza: <strong>{{expiresAt}}</strong></p>
    <p>Rinnova ora per continuare a goderti tutti i vantaggi premium!</p>
    <a href="https://loveableconnect.com/credits" class="btn">💳 Rinnova Abbonamento</a>
    <div class="footer">
      <p>Se hai domande, contatta il nostro supporto.</p>
      <p>Con affetto, il team di LoveableConnect 💖</p>
    </div>
  </div>
</body>
</html>',
  '<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>LoveableConnect - Abbonamento in Scadenza</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #fff5f8;
      color: #333;
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 500px;
      margin: auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 30px;
      text-align: center;
    }
    .logo {
      display: block;
      margin: 0 auto 20px auto;
      width: 140px;
      border-radius: 12px;
    }
    h1 {
      color: #e6397d;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 14px 28px;
      background-color: #e6397d;
      color: #fff;
      text-decoration: none;
      font-weight: bold;
      border-radius: 8px;
      transition: background-color 0.3s ease;
    }
    .btn:hover {
      background-color: #c02765;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://i.imgur.com/L9g9qMA.png" alt="LoveableConnect Logo" class="logo">
    
    <h1>⏰ Il tuo abbonamento sta per scadere!</h1>
    <p>Ciao! Il tuo abbonamento <strong>{{subscriptionType}}</strong> su LoveableConnect scadrà tra <strong>{{daysRemaining}} giorni</strong>.</p>
    <p>Data di scadenza: <strong>{{expiresAt}}</strong></p>
    <p>Rinnova ora per continuare a goderti tutti i vantaggi premium!</p>
    <a href="https://loveableconnect.com/credits" class="btn">💳 Rinnova Abbonamento</a>
    <div class="footer">
      <p>Se hai domande, contatta il nostro supporto.</p>
      <p>Con affetto, il team di LoveableConnect 💖</p>
    </div>
  </div>
</body>
</html>'
)
ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  default_html_content = EXCLUDED.default_html_content;

-- Crea trigger per email di conferma registrazione
CREATE OR REPLACE FUNCTION send_confirmation_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_nickname TEXT;
BEGIN
  -- Ottieni email e nickname
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  SELECT nickname INTO user_nickname FROM public.profiles WHERE id = NEW.id;
  
  -- Chiama edge function per email di conferma
  PERFORM net.http_post(
    url := 'https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/send-confirmation-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI4MjI2NywiZXhwIjoyMDc1ODU4MjY3fQ.TrClYqM5LY0kR5FOfSqb6kjOdCnbqcZtMY3hcUEE7lo"}'::jsonb,
    body := jsonb_build_object(
      'email', user_email,
      'confirmLink', 'https://loveableconnect.com/auth/confirm'
    )
  );
  
  RETURN NEW;
END;
$$;

-- Collega trigger a profiles (viene creato dopo la registrazione)
DROP TRIGGER IF EXISTS on_profile_created_send_confirmation ON public.profiles;
CREATE TRIGGER on_profile_created_send_confirmation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_confirmation_email_trigger();