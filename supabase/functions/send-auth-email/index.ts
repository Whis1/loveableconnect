import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, email_data } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    let emailType = email_data.email_action_type || 'signup';
    let subject = '';
    let htmlContent = '';

    // Template per conferma email (signup)
    if (emailType === 'signup' || emailType === 'magiclink') {
      const confirmationUrl = email_data.confirmation_url || 
        `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${emailType}&redirect_to=${email_data.redirect_to || ''}`;
      
      subject = '💌 Conferma la tua Email - LoveableConnect';
      htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>LoveableConnect - Conferma Email</title>
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
    
    <h1>💌 Conferma la tua Email</h1>
    <p>Ciao! Grazie per esserti registrato su <strong>LoveableConnect</strong>, il luogo dove le connessioni diventano realtà.</p>
    <p>Per completare la registrazione e iniziare la tua avventura romantica, clicca sul pulsante qui sotto:</p>
    <a href="${confirmationUrl}" class="btn">✅ Conferma il tuo Account</a>
    <div class="footer">
      <p>Se non hai effettuato tu la registrazione, ignora questa email.</p>
      <p>Con affetto, il team di LoveableConnect 💖</p>
    </div>
  </div>
</body>
</html>
      `;
    }

    // Template per reset password
    if (emailType === 'recovery') {
      const resetUrl = email_data.confirmation_url || 
        `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=recovery&redirect_to=${email_data.redirect_to || ''}`;
      
      subject = '🔒 Reimposta la tua Password - LoveableConnect';
      htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>LoveableConnect - Reset Password</title>
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
    
    <h1>💖 Reimposta la tua Password</h1>
    <p>Ciao! Abbiamo ricevuto la tua richiesta di cambio password su <strong>LoveableConnect</strong>.</p>
    <p>Per continuare clicca sul pulsante qui sotto:</p>
    <a href="${resetUrl}" class="btn">🔒 Reimposta Password</a>
    <div class="footer">
      <p>Se non hai richiesto tu il cambio password, ignora questa email.</p>
      <p>Con affetto, il team di LoveableConnect 💌</p>
    </div>
  </div>
</body>
</html>
      `;
    }

    // Template per cambio email
    if (emailType === 'email_change') {
      const confirmationUrl = email_data.confirmation_url || 
        `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=email_change&redirect_to=${email_data.redirect_to || ''}`;
      
      subject = '📧 Conferma il Cambio Email - LoveableConnect';
      htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>LoveableConnect - Cambio Email</title>
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
    
    <h1>📧 Conferma il Cambio Email</h1>
    <p>Ciao! Hai richiesto di modificare l'indirizzo email associato al tuo account <strong>LoveableConnect</strong>.</p>
    <p>Per confermare il cambio, clicca sul pulsante qui sotto:</p>
    <a href="${confirmationUrl}" class="btn">✅ Conferma Cambio Email</a>
    <div class="footer">
      <p>Se non hai richiesto tu questa modifica, contattaci immediatamente.</p>
      <p>Con affetto, il team di LoveableConnect 💌</p>
    </div>
  </div>
</body>
</html>
      `;
    }

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: subject,
      html: htmlContent,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending auth email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
