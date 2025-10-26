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

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from("purchases")
      .select("*")
      .eq("stripe_session_id", session_id)
      .eq("user_id", user.id)
      .single();

    if (purchaseError || !purchase) {
      throw new Error("Purchase not found");
    }

    if (purchase.status === "completed") {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Update purchase status
    await supabaseClient
      .from("purchases")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", purchase.id);

    // Add credits to user balance
    const { data: userCredits } = await supabaseClient
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userCredits) {
      await supabaseClient
        .from("user_credits")
        .update({
          balance: userCredits.balance + purchase.credits_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      await supabaseClient.from("user_credits").insert({
        user_id: user.id,
        balance: 40 + purchase.credits_amount,
      });
    }

    // Log transaction
    await supabaseClient.from("credit_transactions").insert({
      user_id: user.id,
      amount: purchase.credits_amount,
      transaction_type: "purchase",
      reason: `Purchased ${purchase.credits_amount} credits`,
      order_id: purchase.id,
    });

    // Send confirmation email
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      const amountEur = (purchase.amount_cents / 100).toFixed(2);
      
      await resend.emails.send({
        from: "LoveableConnect <onboarding@resend.dev>",
        to: [user.email!],
        subject: "💰 Crediti Acquistati con Successo - LoveableConnect",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(59, 130, 246, 0.15);">
              
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 10px;">💰</div>
                <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Crediti Caricati!</h1>
                <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">Il tuo acquisto è confermato</p>
              </div>

              <div style="padding: 40px 30px;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                  🎉 Ottimo! I tuoi crediti sono stati aggiunti con successo al tuo account!
                </p>

                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                  <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Dettagli Acquisto</h3>
                  <div style="color: #1e3a8a; font-size: 15px; line-height: 1.8;">
                    <p style="margin: 8px 0;"><strong>Crediti Acquistati:</strong> <span style="font-size: 24px; color: #3b82f6;">+${purchase.credits_amount}</span></p>
                    <p style="margin: 8px 0;"><strong>Importo Pagato:</strong> €${amountEur}</p>
                    <p style="margin: 8px 0;"><strong>Nuovo Saldo:</strong> <span style="color: #16a34a; font-weight: 700;">${userCredits.balance + purchase.credits_amount} crediti</span></p>
                    <p style="margin: 8px 0; font-size: 12px; opacity: 0.8;"><strong>ID Transazione:</strong> ${session.payment_intent}</p>
                    <p style="margin: 8px 0; font-size: 12px; opacity: 0.8;"><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
                  </div>
                </div>

                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                  <div style="font-size: 36px; margin-bottom: 10px;">💬</div>
                  <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600; line-height: 1.6;">
                    Ogni messaggio costa 2 crediti
                  </p>
                  <p style="margin: 10px 0 0 0; color: #78350f; font-size: 20px; font-weight: 700;">
                    Puoi inviare circa ${Math.floor(purchase.credits_amount / 2)} messaggi!
                  </p>
                </div>

                <div style="background: #dcfce7; padding: 20px; border-radius: 12px; margin: 25px 0;">
                  <div style="text-align: center; margin-bottom: 15px;">
                    <span style="font-size: 32px;">✅</span>
                  </div>
                  <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.6; text-align: center;">
                    <strong>I tuoi crediti sono disponibili immediatamente!</strong><br>
                    <span style="font-size: 14px;">Non scadono mai e rimangono sul tuo account</span>
                  </p>
                </div>

                <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px dashed #9333ea;">
                  <p style="margin: 0; color: #6b21a8; font-size: 14px; line-height: 1.6;">
                    💡 <strong>Suggerimento:</strong> Con l'abbonamento Premium hai crediti illimitati! 👑<br>
                    <span style="font-size: 13px;">Scopri tutti i vantaggi nella sezione Crediti</span>
                  </p>
                </div>

                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                  Grazie per il tuo acquisto! 💖
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
      console.error("Error sending credits confirmation email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, credits_added: purchase.credits_amount }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});