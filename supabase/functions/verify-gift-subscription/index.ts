import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-GIFT] ${step}${detailsStr}`);
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { sessionId: session.id, status: session.payment_status });

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verifica che sia un regalo
    const isGift = session.metadata?.is_gift === "true";
    if (!isGift) {
      throw new Error("This session is not a gift");
    }

    const recipientId = session.metadata?.gift_recipient_id;
    const senderId = session.metadata?.gift_sender_id;
    if (!recipientId) throw new Error("Recipient ID not found in metadata");

    logStep("Gift metadata found", { recipientId, senderId });

    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    logStep("Subscription retrieved", { subscriptionId });

    // Aggiorna il destinatario con Premium
    const updateData: any = {
      is_premium: true,
      premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      stripe_subscription_id: subscriptionId,
      subscription_type: "monthly",
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseClient
      .from("user_credits")
      .update(updateData)
      .eq("user_id", recipientId);

    if (updateError) {
      logStep("ERROR updating recipient credits", { error: updateError });
      throw updateError;
    }

    logStep("Recipient premium status updated");

    // Aggiorna il record del regalo
    const { error: giftUpdateError } = await supabaseClient
      .from("subscription_gifts")
      .update({
        stripe_subscription_id: subscriptionId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session_id);

    if (giftUpdateError) {
      logStep("ERROR updating gift record", { error: giftUpdateError });
    }

    // Crea record purchase
    await supabaseClient.from("purchases").insert({
      user_id: senderId || user.id,
      product_type: "gift_premium_monthly",
      amount_cents: session.amount_total || 29999,
      currency: session.currency || "eur",
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_session_id: session_id,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    logStep("Purchase record created");

    // Invia email al destinatario
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      // Ottieni email del destinatario
      const { data: recipientData } = await supabaseClient.auth.admin.getUserById(recipientId);
      const recipientEmail = recipientData.user?.email;

      // Ottieni nome del sender
      const { data: senderProfile } = await supabaseClient
        .from("profiles")
        .select("nickname, full_name")
        .eq("id", senderId || user.id)
        .single();

      const senderName = senderProfile?.nickname || senderProfile?.full_name || "Un utente";

      if (recipientEmail) {
        const expiryDate = new Date(subscription.current_period_end * 1000);
        
        await resend.emails.send({
          from: "LoveableConnect <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: "🎁 Hai ricevuto un Regalo Premium! - LoveableConnect",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #fce7f3 0%, #e9d5ff 100%);">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(147, 51, 234, 0.15);">
                
                <div style="background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%); padding: 40px 20px; text-align: center; position: relative;">
                  <div style="font-size: 64px; margin-bottom: 10px;">🎁</div>
                  <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Hai ricevuto un Regalo!</h1>
                  <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">${senderName} ti ha regalato Premium</p>
                  <div style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; backdrop-filter: blur(10px);">
                    <span style="color: white; font-weight: 700; font-size: 14px;">👑 PREMIUM</span>
                  </div>
                </div>

                <div style="padding: 40px 30px;">
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                    🎉 <strong>${senderName}</strong> ti ha regalato un abbonamento <strong style="color: #ec4899;">Premium Mensile</strong>! Il tuo account è stato aggiornato e ora hai accesso a tutti i vantaggi Premium!
                  </p>

                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Dettagli Regalo</h3>
                    <div style="color: #78350f; font-size: 15px; line-height: 1.8;">
                      <p style="margin: 8px 0;"><strong>Piano:</strong> Premium Mensile 👑</p>
                      <p style="margin: 8px 0;"><strong>Regalo da:</strong> ${senderName}</p>
                      <p style="margin: 8px 0;"><strong>Valido fino:</strong> ${expiryDate.toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>

                  <div style="background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%); padding: 25px; border-radius: 12px; margin: 25px 0;">
                    <h3 style="color: #9333ea; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">✨ I tuoi Vantaggi Premium</h3>
                    <div style="color: #6b7280; line-height: 1.8;">
                      <div style="display: flex; align-items: start; margin-bottom: 12px;">
                        <span style="font-size: 24px; margin-right: 12px;">💬</span>
                        <div>
                          <strong style="color: #9333ea;">Crediti Illimitati</strong><br>
                          <span style="font-size: 14px;">Invia messaggi senza limiti</span>
                        </div>
                      </div>
                      <div style="display: flex; align-items: start; margin-bottom: 12px;">
                        <span style="font-size: 24px; margin-right: 12px;">❤️</span>
                        <div>
                          <strong style="color: #ec4899;">Accesso Completo ai Likes</strong><br>
                          <span style="font-size: 14px;">Vedi tutti i likes ricevuti</span>
                        </div>
                      </div>
                      <div style="display: flex; align-items: start; margin-bottom: 12px;">
                        <span style="font-size: 24px; margin-right: 12px;">⭐</span>
                        <div>
                          <strong style="color: #f59e0b;">Priorità nella Visualizzazione</strong><br>
                          <span style="font-size: 14px;">Appari più in alto nei risultati</span>
                        </div>
                      </div>
                      <div style="display: flex; align-items: start;">
                        <span style="font-size: 24px; margin-right: 12px;">👑</span>
                        <div>
                          <strong style="color: #f59e0b;">Badge Premium</strong><br>
                          <span style="font-size: 14px;">Spicca con il badge esclusivo</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
                    Grazie per essere parte di LoveableConnect! 💖
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
        logStep("Email sent to recipient");
      }
    } catch (emailError) {
      console.error("Error sending gift email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, premium_active: true, is_gift: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-gift-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
