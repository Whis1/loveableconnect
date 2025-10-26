import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { email, confirmationUrl, nickname } = await req.json();

    if (!email || !confirmationUrl) {
      throw new Error("Email and confirmation URL are required");
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    await resend.emails.send({
      from: "Arrettu <onboarding@resend.dev>",
      to: [email],
      subject: "💕 Conferma il tuo Account - Arrettu",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #fce7f3 0%, #e9d5ff 100%);">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(147, 51, 234, 0.15);">
            
            <!-- Header con gradient -->
            <div style="background: linear-gradient(135deg, #ec4899 0%, #9333ea 100%); padding: 40px 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">💘</div>
              <h1 style="color: white; font-size: 32px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Arrettu</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Trova l'amore che cerchi</p>
            </div>

            <!-- Contenuto principale -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #9333ea; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Ciao ${nickname || 'there'}! 👋</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                Benvenuto su <strong style="color: #ec4899;">Arrettu</strong>! Siamo entusiasti di averti con noi nella nostra community. 💖
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Per iniziare il tuo viaggio verso connessioni autentiche, conferma il tuo indirizzo email cliccando sul pulsante qui sotto:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${confirmationUrl}" 
                   style="background: linear-gradient(135deg, #ec4899 0%, #9333ea 100%); 
                          color: white; 
                          padding: 18px 40px; 
                          text-decoration: none; 
                          border-radius: 12px; 
                          display: inline-block;
                          font-weight: 700;
                          font-size: 16px;
                          box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
                          transition: all 0.3s ease;">
                  ✅ Conferma la tua Email
                </a>
              </div>

              <!-- Info Box -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Importante:</strong> Se non hai richiesto questa registrazione, puoi tranquillamente ignorare questa email.
                </p>
              </div>

              <!-- Features Box -->
              <div style="background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%); padding: 25px; border-radius: 12px; margin: 25px 0;">
                <h3 style="color: #9333ea; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">🌟 Cosa puoi fare su Arrettu:</h3>
                <ul style="color: #6b7280; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">💫 Scopri profili compatibili nella tua zona</li>
                  <li style="margin-bottom: 8px;">💬 Chatta con persone interessanti</li>
                  <li style="margin-bottom: 8px;">❤️ Ricevi notifiche sui likes</li>
                  <li style="margin-bottom: 8px;">✨ Trova la tua anima gemella</li>
                </ul>
              </div>

              <!-- Link alternativo -->
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong>Il pulsante non funziona?</strong><br>
                  Copia e incolla questo link nel tuo browser:<br>
                  <a href="${confirmationUrl}" style="color: #9333ea; word-break: break-all; text-decoration: underline;">${confirmationUrl}</a>
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0;">
                Questo link scadrà tra 24 ore
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                💘 <strong style="color: #ec4899;">Arrettu</strong> - Connessioni autentiche, storie vere
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
