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
    const { userId, email, nickname } = await req.json();

    if (!userId || !email) {
      throw new Error("userId e email sono obbligatori");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Helper: replace {{placeholders}}
    const replaceVars = (text: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v ?? ''), text);

    // Try to load template from DB
    const { data: tmpl } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'welcome_email')
      .maybeSingle();

    const variables = {
      nickname: nickname || 'Utente',
    } as Record<string, string>;

    const subject = tmpl ? replaceVars(tmpl.subject, variables) : "Benvenuto su LoveableConnect! 💕";
    const html = tmpl ? replaceVars(tmpl.html_content, variables) : `
        <!DOCTYPE html>
        <html lang="it">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
            <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
                <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Benvenuto su LoveableConnect! 💕</h1>
              </div>
              <div style="padding:40px 30px;">
                <p>Ciao <strong>${nickname || 'Utente'}</strong>!</p>
                <p>Siamo felici di averti con noi! Il tuo account è stato creato con successo.</p>
                <p>Inizia subito a esplorare e trovare nuove connessioni! ✨</p>
                <div style="text-align:center; margin:30px 0;">
                  <a href="https://loveableconnect.com" style="display:inline-block; background:linear-gradient(135deg,#ec4899,#9333ea); color:white; padding:15px 40px; border-radius:25px; text-decoration:none; font-weight:bold;">Inizia Ora</a>
                </div>
              </div>
            </div>
          </body>
        </html>`;

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Errore nell'invio dell'email di benvenuto:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
