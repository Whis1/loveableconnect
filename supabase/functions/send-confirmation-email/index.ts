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
      from: "Love App <onboarding@resend.dev>",
      to: [email],
      subject: "✨ Conferma il tuo Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #9333ea; font-size: 32px; margin: 0;">💕 Love App</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #fce7f3 0%, #e9d5ff 100%); padding: 30px; border-radius: 12px; margin: 20px 0;">
            <h2 style="color: #9333ea; margin-top: 0;">Ciao ${nickname || 'there'}! 👋</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Benvenuto su Love App! Siamo felici di averti con noi. 
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Per completare la registrazione e iniziare a conoscere persone fantastiche, 
              devi confermare il tuo indirizzo email.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="background: linear-gradient(135deg, #ec4899 0%, #9333ea 100%); 
                      color: white; 
                      padding: 16px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 6px rgba(147, 51, 234, 0.3);">
              ✅ Conferma Email
            </a>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⚠️ Se non hai richiesto questa registrazione, ignora questa email.
            </p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0; font-size: 18px;">📱 Cosa puoi fare su Love App:</h3>
            <ul style="color: #6b7280; line-height: 1.8;">
              <li>Scopri profili nella tua zona</li>
              <li>Chatta con persone interessanti</li>
              <li>Ricevi notifiche sui likes</li>
              <li>Trova la tua anima gemella 💕</li>
            </ul>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p>Questo link scadrà tra 24 ore.</p>
            <p style="margin-top: 10px;">
              Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
              <a href="${confirmationUrl}" style="color: #9333ea; word-break: break-all;">${confirmationUrl}</a>
            </p>
          </div>
        </div>
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
