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
    const { userId, previousSubscriptionType } = await req.json();

    if (!userId) {
      throw new Error("userId è obbligatorio");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user?.email) {
      console.error("User not found or no email:", userError);
      return new Response(JSON.stringify({ success: false, error: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const planName = previousSubscriptionType === 'weekly' ? 'Premium Settimanale' : 'Premium Mensile';

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: "😢 Il tuo abbonamento è scaduto",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Abbonamento Scaduto</title>
        </head>
        <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
            
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
              <div style="font-size:48px;">😢</div>
              <h1 style="color:white; margin:10px 0 0; font-size:32px;">Abbonamento Scaduto</h1>
            </div>

            <!-- BODY -->
            <div style="padding:40px 30px;">
              <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px;">Ci manchi! 💔</h2>
              <p style="color:#374151; font-size:16px; line-height:1.6;">
                Il tuo abbonamento <strong style="color:#ec4899;">${planName}</strong> è scaduto.
              </p>

              <!-- CURRENT STATUS -->
              <div style="background:#fee2e2; padding:25px; border-radius:12px; border-left:4px solid #ef4444; margin:25px 0;">
                <p style="margin:0; color:#991b1b; font-size:16px; line-height:1.6;">
                  ⚠️ Ora sei tornato al piano gratuito con:<br><br>
                  • 16 crediti messaggi al giorno<br>
                  • 8 like al giorno<br>
                  • Funzionalità base
                </p>
              </div>

              <p style="color:#374151; font-size:16px; line-height:1.6;">
                Riattiva il tuo abbonamento Premium per tornare a goderti tutti i vantaggi esclusivi!
              </p>

              <!-- FEATURES -->
              <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:12px; margin-top:25px;">
                <h3 style="color:#9333ea; margin-bottom:10px; font-size:18px;">✨ Torna Premium e ottieni:</h3>
                <ul style="color:#4b5563; font-size:15px; line-height:1.8; margin:0; padding-left:20px;">
                  <li>💬 Messaggi illimitati (piano mensile) o 40 crediti/giorno (piano settimanale)</li>
                  <li>❤️ Molti più like ogni giorno</li>
                  <li>✨ Profilo in evidenza nei risultati di ricerca</li>
                  <li>🎯 Accesso a tutte le funzionalità premium</li>
                </ul>
              </div>

              <!-- BUTTON -->
              <div style="text-align:center; margin:35px 0;">
                <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '')}/credits"
                   style="background:linear-gradient(135deg,#ec4899,#9333ea);
                          color:white;
                          padding:16px 40px;
                          border-radius:12px;
                          font-weight:700;
                          text-decoration:none;
                          font-size:17px;
                          box-shadow:0 5px 20px rgba(147,51,234,0.3);">
                  👑 Riattiva Premium
                </a>
              </div>

              <!-- SPECIAL OFFER BOX -->
              <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:25px; border-radius:12px; border-left:4px solid #f97316;">
                <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5;">
                  🎁 <strong>Offerta speciale per te!</strong> Riattiva entro 7 giorni e continua da dove avevi lasciato, senza perdere nessun match!
                </p>
              </div>
            </div>

            <!-- FOOTER -->
            <div style="background:#fafafa; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af; font-size:12px;">💕 LoveableConnect – Dove nascono legami autentici</p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Errore nell'invio dell'email di abbonamento scaduto:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
