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

    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update user credits with premium status
    await supabaseClient
      .from("user_credits")
      .update({
        is_premium: true,
        premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    // Create purchase record
    await supabaseClient.from("purchases").insert({
      user_id: user.id,
      product_type: "premium_monthly",
      amount_cents: 9999,
      currency: "eur",
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_session_id: session_id,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // Send confirmation email
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      const expiryDate = new Date(subscription.current_period_end * 1000);
      
      await resend.emails.send({
        from: "Love App <onboarding@resend.dev>",
        to: [user.email!],
        subject: "✨ Abbonamento Premium Attivato!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #9333ea;">🎉 Benvenuto tra i Premium!</h1>
            <p>Ciao,</p>
            <p>Il tuo abbonamento Premium è stato attivato con successo!</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #374151;">Dettagli Abbonamento</h2>
              <p><strong>Piano:</strong> Premium Mensile</p>
              <p><strong>Importo:</strong> €99.99</p>
              <p><strong>Valido fino:</strong> ${expiryDate.toLocaleDateString('it-IT')}</p>
              <p><strong>ID Pagamento:</strong> ${session.payment_intent}</p>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">✨ I tuoi vantaggi Premium:</h3>
              <ul style="color: #78350f;">
                <li>Crediti illimitati per messaggi</li>
                <li>Accesso completo ai likes ricevuti</li>
                <li>Priorità nella visualizzazione</li>
                <li>Badge Premium sul profilo</li>
              </ul>
            </div>

            <p>Grazie per il tuo supporto!</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Riceverai una notifica prima della scadenza del tuo abbonamento.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Error sending premium confirmation email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, premium_active: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-subscription:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});