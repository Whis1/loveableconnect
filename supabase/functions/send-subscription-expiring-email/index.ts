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
    const { userId, subscriptionType, daysRemaining, expiresAt } = await req.json();

    if (!userId || !subscriptionType) {
      throw new Error("userId e subscriptionType sono obbligatori");
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

    const planName = subscriptionType === 'weekly' ? 'Premium Settimanale' : 'Premium Mensile';
    const expiryDate = new Date(expiresAt).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [user.email],
      subject: "⏰ Il tuo abbonamento sta per scadere",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Abbonamento in scadenza</title>
        </head>
        <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
            
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
              <div style="font-size:48px;">⏰</div>
              <h1 style="color:white; margin:10px 0 0; font-size:32px;">Abbonamento in Scadenza</h1>
            </div>

            <!-- BODY -->
            <div style="padding:40px 30px;">
              <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px;">Non perdere i tuoi vantaggi! 👑</h2>
              <p style="color:#374151; font-size:16px; line-height:1.6;">
                Il tuo abbonamento <strong style="color:#ec4899;">${planName}</strong> sta per scadere!
              </p>

              <!-- EXPIRY INFO -->
              <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:25px; border-radius:12px; border-left:4px solid #f97316; margin:25px 0;">
                <p style="margin:0; color:#92400e; font-size:16px; line-height:1.6;">
                  ⏰ <strong>Scadenza:</strong> ${expiryDate}<br>
                  📅 <strong>Giorni rimanenti:</strong> ${daysRemaining}
                </p>
              </div>

              <p style="color:#374151; font-size:16px; line-height:1.6;">
                Rinnova ora per continuare a goderti tutti i vantaggi Premium:
              </p>

              <!-- FEATURES -->
              <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:12px; margin-top:25px;">
                <h3 style="color:#9333ea; margin-bottom:10px; font-size:18px;">✨ Vantaggi Premium:</h3>
                <ul style="color:#4b5563; font-size:15px; line-height:1.8; margin:0; padding-left:20px;">
                  ${subscriptionType === 'monthly' ? `
                    <li>💬 Messaggi illimitati senza costi aggiuntivi</li>
                    <li>❤️ Like illimitati ogni giorno</li>
                    <li>✨ Profilo in evidenza nei risultati di ricerca</li>
                    <li>🎯 Filtri di ricerca avanzati</li>
                  ` : `
                    <li>💬 40 crediti messaggi al giorno</li>
                    <li>❤️ 30 like al giorno</li>
                    <li>✨ Profilo in evidenza nei risultati</li>
                    <li>🎁 5 conversazioni gratuite al giorno</li>
                  `}
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
                  👑 Rinnova Ora
                </a>
              </div>

              <!-- INFO BOX -->
              <div style="background:#f9fafb; padding:20px; border-radius:12px; border-left:4px solid #9333ea;">
                <p style="margin:0; color:#6b7280; font-size:14px; line-height:1.5;">
                  💡 Il rinnovo è automatico se hai attivato l'abbonamento ricorrente. Altrimenti, rinnova manualmente per non perdere i vantaggi!
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
    console.error("Errore nell'invio dell'email di scadenza abbonamento:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
