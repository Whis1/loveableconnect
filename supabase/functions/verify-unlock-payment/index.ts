import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Session ID required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Verifying unlock payment session:", session_id);

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      console.log("Payment not completed:", session.payment_status);
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Payment verified, unlocking likes for user:", user.id);

    // Check if already unlocked
    const { data: existingUnlock } = await supabaseClient
      .from("likes_unlocked")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingUnlock) {
      console.log("Likes already unlocked for user");
      return new Response(
        JSON.stringify({ success: true, message: "Already unlocked" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Insert unlock record with 24h expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: insertError } = await supabaseClient
      .from("likes_unlocked")
      .insert({
        user_id: user.id,
        stripe_payment_id: session.payment_intent as string,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting unlock record:", insertError);
      throw insertError;
    }

    console.log("Likes unlocked successfully until:", expiresAt);

    // Send confirmation email
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      await resend.emails.send({
        from: "LoveableConnect <noreply@loveableconnect.com>",
        to: [user.email!],
        subject: "💕 Likes Sbloccati per 24 Ore - LoveableConnect",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #fce7f3 0%, #fae8ff 100%);">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(236, 72, 153, 0.2);">
              
              <div style="background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); padding: 40px 20px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 10px;">💕</div>
                <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Likes Sbloccati!</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Scopri chi ti ama</p>
              </div>

              <div style="padding: 40px 30px;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                  🎉 Fantastico! Hai sbloccato l'accesso ai tuoi likes ricevuti per le prossime 24 ore!
                </p>

                <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #ec4899;">
                  <h3 style="color: #9f1239; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Dettagli Sblocco</h3>
                  <div style="color: #831843; font-size: 15px; line-height: 1.8;">
                    <p style="margin: 8px 0;"><strong>Importo:</strong> €2.99</p>
                    <p style="margin: 8px 0;"><strong>Durata:</strong> 24 ore ⏰</p>
                    <p style="margin: 8px 0;"><strong>Valido fino:</strong> ${expiresAt.toLocaleString('it-IT')}</p>
                    <p style="margin: 8px 0; font-size: 12px; opacity: 0.8;"><strong>ID Pagamento:</strong> ${session.payment_intent}</p>
                  </div>
                </div>

                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 10px;">✨</div>
                  <p style="margin: 0; color: #92400e; font-size: 17px; font-weight: 600; line-height: 1.6;">
                    Ora puoi vedere chi ha messo like al tuo profilo e iniziare a chattare!
                  </p>
                </div>

                <div style="background: #e0f2fe; padding: 20px; border-radius: 12px; margin: 25px 0;">
                  <p style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 15px; line-height: 1.6;">
                    💡 <strong>Suggerimento:</strong> Approfitta di queste 24 ore per:
                  </p>
                  <ul style="color: #0c4a6e; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Vedere tutti i profili che ti hanno messo like</li>
                    <li>Ricambiare i likes che ti interessano</li>
                    <li>Creare nuove connessioni e match</li>
                  </ul>
                </div>

                <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px dashed #9333ea;">
                  <p style="margin: 0; color: #6b21a8; font-size: 15px; line-height: 1.6;">
                    ⏰ Dopo 24 ore l'accesso ai likes tornerà limitato.<br>
                    <strong>Vuoi accesso illimitato?</strong> Considera l'abbonamento Premium! 👑
                  </p>
                </div>

                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                  Buona fortuna con le tue connessioni! 💖
                </p>
              </div>

              <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  💕 <strong style="color: #ec4899;">LoveableConnect</strong> - Connessioni autentiche, storie vere
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error("Error sending unlock confirmation email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-unlock-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
