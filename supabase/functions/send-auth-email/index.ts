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
    const payload = await req.json();
    console.log("Auth email webhook payload:", payload);

    const {
      user,
      email_data,
    } = payload;

    if (!user || !user.email) {
      throw new Error("User email not found in payload");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Helper: replace {{placeholders}}
    const replaceVars = (text: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v ?? ''), text);

    // Determina il tipo di email e il template key
    let templateKey = '';
    let subject = '';
    let defaultHtml = '';
    const variables: Record<string, string> = {
      email: user.email,
      nickname: user.user_metadata?.nickname || user.user_metadata?.full_name || 'Utente',
    };

    // Email di conferma registrazione
    if (email_data?.token_hash && email_data?.email_action_type === 'signup') {
      templateKey = 'email_confirmation';
      const confirmUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=signup`;
      variables.confirmation_url = confirmUrl;
      variables.token = email_data.token || '';
      
      subject = "Conferma il tuo account - LoveableConnect 💕";
      defaultHtml = `
        <!DOCTYPE html>
        <html lang="it">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Conferma il tuo account 💕</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Ciao <strong>${variables.nickname}</strong>!</p>
                <p>Benvenuto su LoveableConnect! Per completare la registrazione, conferma il tuo indirizzo email:</p>
                <div style="text-align:center; margin:30px 0;">
                  <a href="${confirmUrl}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Conferma Email</a>
                </div>
                <p style="font-size:12px; color:#666;">Se il pulsante non funziona, copia questo link: ${confirmUrl}</p>
              </div>
            </div>
          </body>
        </html>`;
    }
    // Email di reset password
    else if (email_data?.token_hash && (email_data?.email_action_type === 'recovery' || email_data?.email_action_type === 'magiclink')) {
      templateKey = 'password_reset';
      const resetUrl = `${email_data.site_url}/reset-password?token_hash=${email_data.token_hash}&type=recovery`;
      variables.reset_url = resetUrl;
      variables.token = email_data.token || '';
      
      subject = "Reset della Password - LoveableConnect 💕";
      defaultHtml = `
        <!DOCTYPE html>
        <html lang="it">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Reset Password 🔒</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Ciao <strong>${variables.nickname}</strong>!</p>
                <p>Hai richiesto di reimpostare la tua password. Clicca sul pulsante qui sotto per procedere:</p>
                <div style="text-align:center; margin:30px 0;">
                  <a href="${resetUrl}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Reimposta Password</a>
                </div>
                <p style="font-size:12px; color:#666;">Se non hai richiesto questo reset, ignora questa email.</p>
                <p style="font-size:12px; color:#666;">Link: ${resetUrl}</p>
              </div>
            </div>
          </body>
        </html>`;
    }
    // Magic Link
    else if (email_data?.token_hash && email_data?.email_action_type === 'magiclink') {
      templateKey = 'magic_link';
      const magicUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=magiclink`;
      variables.magic_url = magicUrl;
      variables.token = email_data.token || '';
      
      subject = "Il tuo Magic Link - LoveableConnect ✨";
      defaultHtml = `
        <!DOCTYPE html>
        <html lang="it">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Accedi con Magic Link ✨</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Ciao <strong>${variables.nickname}</strong>!</p>
                <p>Clicca sul pulsante qui sotto per accedere al tuo account:</p>
                <div style="text-align:center; margin:30px 0;">
                  <a href="${magicUrl}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Accedi Ora</a>
                </div>
                <p style="font-size:12px; color:#666;">Se non hai richiesto questo link, ignora questa email.</p>
              </div>
            </div>
          </body>
        </html>`;
    }
    // Email cambio indirizzo
    else if (email_data?.token_hash && email_data?.email_action_type === 'email_change') {
      templateKey = 'email_change';
      const changeUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=email_change`;
      variables.change_url = changeUrl;
      variables.new_email = email_data.new_email || user.email;
      
      subject = "Conferma cambio email - LoveableConnect 📧";
      defaultHtml = `
        <!DOCTYPE html>
        <html lang="it">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Conferma cambio email 📧</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Ciao <strong>${variables.nickname}</strong>!</p>
                <p>Hai richiesto di cambiare il tuo indirizzo email. Conferma il nuovo indirizzo:</p>
                <div style="text-align:center; margin:30px 0;">
                  <a href="${changeUrl}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Conferma Cambio</a>
                </div>
              </div>
            </div>
          </body>
        </html>`;
    }
    // Invito
    else if (email_data?.token_hash && email_data?.email_action_type === 'invite') {
      templateKey = 'invite';
      const inviteUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=invite`;
      variables.invite_url = inviteUrl;
      variables.inviter_name = email_data.inviter_name || 'Un membro';
      
      subject = "Sei stato invitato! - LoveableConnect 💌";
      defaultHtml = `
        <!DOCTYPE html>
        <html lang="it">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Sei stato invitato! 💌</h1>
              </div>
              <div style="padding:40px 30px;">
                <p><strong>${variables.inviter_name}</strong> ti ha invitato a unirti a LoveableConnect!</p>
                <p>Clicca sul pulsante per accettare l'invito:</p>
                <div style="text-align:center; margin:30px 0;">
                  <a href="${inviteUrl}" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Accetta Invito</a>
                </div>
              </div>
            </div>
          </body>
        </html>`;
    }

    // Se non abbiamo identificato il tipo, usa un template generico
    if (!templateKey) {
      console.log("Unknown email type, using generic template");
      templateKey = 'generic_auth';
      subject = "LoveableConnect - Notifica 💕";
      defaultHtml = `
        <!DOCTYPE html>
        <html lang="it">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">LoveableConnect 💕</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Ciao ${variables.nickname}!</p>
                <p>Hai ricevuto questa email da LoveableConnect.</p>
              </div>
            </div>
          </body>
        </html>`;
    }

    // Prova a caricare il template dal database
    const { data: tmpl } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .maybeSingle();

    const finalSubject = tmpl ? replaceVars(tmpl.subject, variables) : subject;
    const finalHtml = tmpl ? replaceVars(tmpl.html_content, variables) : defaultHtml;

    // Invia l'email
    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: finalSubject,
      html: finalHtml,
    });

    console.log(`Email sent successfully: ${templateKey} to ${user.email}`);

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
