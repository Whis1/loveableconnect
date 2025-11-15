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
          persistSession: false,
        },
      },
    );

    // Generate email confirmation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
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
              <img src="https://tcmhvrlsaggyuukdscue.supabase.co/storage/v1/object/public/images/loveable-logo.png" alt="LoveableConnect" style="width:120px; height:120px; margin-bottom:20px; border-radius:50%; border:4px solid rgba(255,255,255,0.3); box-shadow:0 8px 32px rgba(0,0,0,0.2);" />
              <h1 style="color:white; margin:10px 0 0; font-size:32px; font-weight:800;">Benvenuto su LoveableConnect!</h1>
              <p style="color:rgba(255,255,255,0.95); font-size:16px; margin-top:10px;">✨ Connettiti, condividi, vivi emozioni autentiche ✨</p>
            </div>

            <!-- BODY -->
            <div style="padding:40px 30px;">
              <h2 style="color:#9333ea; font-size:24px; margin-bottom:15px;">Ciao ${nickname || "nuovo utente"}! 👋💕</h2>
              <p style="color:#374151; font-size:16px; line-height:1.6;">
                Siamo <strong style="color:#ec4899;">entusiasti</strong> di darti il benvenuto su <strong style="color:#9333ea;">LoveableConnect</strong>!  
                Prima di iniziare questa fantastica avventura, dobbiamo solo verificare che questa email ti appartenga.
              </p>

              <p style="color:#374151; font-size:16px; line-height:1.6; margin-top:25px;">
                Clicca sul pulsante qui sotto per confermare il tuo account e iniziare la tua esperienza:
              </p>

              <!-- BUTTON -->
              <div style="text-align:center; margin:35px 0;">
                <a href="${confirmationUrl}"
                   style="display:inline-block;
                          background:linear-gradient(135deg,#ec4899,#9333ea);
                          color:white;
                          padding:18px 45px;
                          border-radius:16px;
                          font-weight:700;
                          text-decoration:none;
                          font-size:18px;
                          box-shadow:0 8px 30px rgba(147,51,234,0.4);
                          transition:all 0.3s ease;
                          border:2px solid rgba(255,255,255,0.2);">
                  ✅ Conferma la mia Email
                </a>
              </div>

              <!-- INFO BOX -->
              <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:20px; border-radius:12px; border-left:5px solid #f97316; margin-top:30px;">
                <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5;">
                  <strong>⚠️ Importante:</strong> Se non hai creato un account su LoveableConnect, ignora questa email in sicurezza.
                </p>
              </div>

              <!-- FEATURES -->
              <div style="background:linear-gradient(135deg,#f3e8ff,#fce7f3); padding:25px; border-radius:16px; margin-top:30px; border:2px solid rgba(236,72,153,0.1);">
                <h3 style="color:#9333ea; margin-bottom:15px; font-size:20px; font-weight:700;">💞 Cosa puoi fare su LoveableConnect:</h3>
                <ul style="color:#4b5563; font-size:15px; line-height:2; margin:0; padding-left:0; list-style:none;">
                  <li>💬 <strong>Conoscere persone vere</strong> e interessanti</li>
                  <li>❤️ <strong>Scoprire chi ti apprezza</strong> con i like al tuo profilo</li>
                  <li>✨ <strong>Trovare connessioni sincere</strong> e profonde</li>
                  <li>🌍 <strong>Esplorare nuove possibilità</strong> vicino a te</li>
                  <li>🎮 <strong>Giocare e divertirti</strong> con match interattivi</li>
                </ul>
              </div>

              <!-- ALTERNATE LINK -->
              <div style="margin-top:30px; background:#f9fafb; padding:18px; border-radius:12px; border:1px solid #e5e7eb;">
                <p style="color:#6b7280; font-size:13px; line-height:1.6; margin:0 0 8px 0;">
                  <strong>Il pulsante non funziona?</strong> Copia e incolla questo link nel tuo browser:
                </p>
                <a href="${confirmationUrl}" style="color:#9333ea; font-size:12px; word-break:break-all; font-weight:600;">${confirmationUrl}</a>
              </div>
            </div>

            <!-- FOOTER -->
            <div style="background:linear-gradient(135deg,#fafafa,#f3f4f6); padding:25px; text-align:center; border-top:2px solid #e5e7eb;">
              <p style="color:#9ca3af; font-size:13px; margin:5px 0;">⏰ Questo link scadrà tra 24 ore</p>
              <p style="color:#6b7280; font-size:14px; margin:15px 0 5px 0; font-weight:600;">💕 LoveableConnect</p>
              <p style="color:#9ca3af; font-size:12px; margin:0;">Dove nascono legami autentici</p>
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
