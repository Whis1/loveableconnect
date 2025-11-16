-- Inserisci i template per tutti i tipi di email se non esistono già
INSERT INTO email_templates (template_key, template_name, subject, html_content, default_html_content, description)
VALUES 
  (
    'email_confirmation',
    'Conferma Email',
    'Conferma il tuo account - LoveableConnect 💕',
    '<!DOCTYPE html>
<html lang="it">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
        <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Conferma il tuo account 💕</h1>
      </div>
      <div style="padding:40px 30px;">
        <p>Ciao <strong>{{nickname}}</strong>!</p>
        <p>Benvenuto su LoveableConnect! Per completare la registrazione, conferma il tuo indirizzo email:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="{{confirmation_url}}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Conferma Email</a>
        </div>
        <p style="font-size:12px; color:#666;">Se il pulsante non funziona, copia questo link: {{confirmation_url}}</p>
      </div>
    </div>
  </body>
</html>',
    '<!DOCTYPE html>
<html lang="it">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
        <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Conferma il tuo account 💕</h1>
      </div>
      <div style="padding:40px 30px;">
        <p>Ciao <strong>{{nickname}}</strong>!</p>
        <p>Benvenuto su LoveableConnect! Per completare la registrazione, conferma il tuo indirizzo email:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="{{confirmation_url}}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Conferma Email</a>
        </div>
        <p style="font-size:12px; color:#666;">Se il pulsante non funziona, copia questo link: {{confirmation_url}}</p>
      </div>
    </div>
  </body>
</html>',
    'Email inviata per confermare la registrazione'
  ),
  (
    'password_reset',
    'Reset Password',
    'Reset della Password - LoveableConnect 💕',
    '<!DOCTYPE html>
<html lang="it">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
        <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Reset Password 🔒</h1>
      </div>
      <div style="padding:40px 30px;">
        <p>Ciao <strong>{{nickname}}</strong>!</p>
        <p>Hai richiesto di reimpostare la tua password. Clicca sul pulsante qui sotto per procedere:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="{{reset_url}}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Reimposta Password</a>
        </div>
        <p style="font-size:12px; color:#666;">Se non hai richiesto questo reset, ignora questa email.</p>
      </div>
    </div>
  </body>
</html>',
    '<!DOCTYPE html>
<html lang="it">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
        <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Reset Password 🔒</h1>
      </div>
      <div style="padding:40px 30px;">
        <p>Ciao <strong>{{nickname}}</strong>!</p>
        <p>Hai richiesto di reimpostare la tua password. Clicca sul pulsante qui sotto per procedere:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="{{reset_url}}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Reimposta Password</a>
        </div>
        <p style="font-size:12px; color:#666;">Se non hai richiesto questo reset, ignora questa email.</p>
      </div>
    </div>
  </body>
</html>',
    'Email inviata per il reset della password'
  )
ON CONFLICT (template_key) DO NOTHING;