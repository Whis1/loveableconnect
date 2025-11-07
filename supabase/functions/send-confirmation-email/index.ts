import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nickname } = await req.json();

    if (!email) {
      throw new Error("Email è obbligatoria.");
    }

    // Create Supabase admin client to generate confirmation link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generate email confirmation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
    });

    if (linkError) {
      throw new Error(`Failed to generate confirmation link: ${linkError.message}`);
    }

    const confirmationUrl = linkData.properties.action_link;
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    await resend.emails.send({
      from: "LoveableConnect 💕 <noreply@loveableconnect.com>",
      to: [email],
      subject: "💖 Benvenuto su LoveableConnect – Conferma il tuo account!",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Conferma la tua Email</title>
        </head>
        <body style="margin:0; padding:0; background:linear-gradient(135deg,#fde2e4,#f3e8ff); font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:white; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">

            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#ec4899,#9333ea); padding:40px 20px; text-align:center;">
              <div style="font-size:48px;">💘</div>
              <h1 style="color:white; margin:10px 0 0; font-size:32px;">Benvenuto su LoveableConnect!</h1>
              <p style="color:rgba(255,255,255,0.9); font-size:16px;">Connettiti, condividi, vivi emozioni autentiche.</p>
            </div>

            <!-- BODY -->
            <div style="padding:40px 30px;">
              <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px;">Ciao ${nickname || "nuovo utente"} 👋</h2>
              <p style="color:#374151; font-size:16px; line-height:1.6;">
                Siamo entusiasti di darti il benvenuto su <strong style="color:#ec4899;">LoveableConnect</strong>!  
                Prima di iniziare, dobbiamo solo verificare che questa email ti appartenga.
              </p>

              <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:25px;">
                Clicca sul pulsante qui sotto per confermare il tuo account e iniziare la tua esperienza:
              </p>

              <!-- BUTTON -->
              <div style="text-align:center; margin:35px 0;">
                <a href="${confirmationUrl}"
                   style="background:linear-gradient(135deg,#ec4899,#9333ea);
                          color:white;
                          padding:16px 40px;
                          border-radius:12px;
                          font-weight:700;
                          text-decoration:none;
                          font-size:17px;
                          box-shadow:0 5px 20px rgba(147,51,234,0.3);
                          transition:all 0.3s ease;">
                  ✅ Conferma la mia Email
                </a>
              </div>

              <!-- INFO BOX -->
              <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; border-left:4px solid #f97316;">
                <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5;">
                  ⚠️ Se non hai creato un account su LoveableConnect, ignora questa email: nessuna azione verrà intrapresa.
                </p>
              </div>

              <!-- FEATURES -->
              <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:12px; margin-top:25px;">
                <h3 style="color:#9333ea; margin-bottom:10px; font-size:18px;">💞 Su LoveableConnect puoi:</h3>
                <ul style="color:#4b5563; font-size:15px; line-height:1.8; margin:0; padding-left:20px;">
                  <li>💬 Conoscere persone vere e interessanti</li>
                  <li>❤️ Scoprire chi ha messo like al tuo profilo</li>
                  <li>✨ Trovare connessioni sincere e profonde</li>
                  <li>🌍 Esplorare nuove possibilità vicino a te</li>
                </ul>
              </div>

              <!-- ALTERNATE LINK -->
              <div style="margin-top:30px; background:#f9fafb; padding:15px; border-radius:10px;">
                <p style="color:#6b7280; font-size:13px; line-height:1.6;">
                  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:
                </p>
                <a href="${confirmationUrl}" style="color:#9333ea; font-size:13px; word-break:break-all;">${confirmationUrl}</a>
              </div>
            </div>

            <!-- FOOTER -->
            <div style="background:#fafafa; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af; font-size:12px;">Questo link scadrà tra 24 ore.</p>
              <p style="color:#9ca3af; font-size:12px; margin-top:5px;">💕 LoveableConnect – Dove nascono legami autentici</p>
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
    console.error("Errore nell'invio dell'email di conferma:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
