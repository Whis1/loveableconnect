import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

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
        from: "Love App <onboarding@resend.dev>",
        to: [user.email!],
        subject: "💰 Crediti Acquistati con Successo!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #9333ea;">💰 Crediti Caricati!</h1>
            <p>Ciao,</p>
            <p>I tuoi crediti sono stati aggiunti con successo al tuo account!</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #374151;">Dettagli Acquisto</h2>
              <p><strong>Crediti Acquistati:</strong> ${purchase.credits_amount}</p>
              <p><strong>Importo Pagato:</strong> €${amountEur}</p>
              <p><strong>Nuovo Saldo:</strong> ${userCredits.balance + purchase.credits_amount} crediti</p>
              <p><strong>ID Transazione:</strong> ${session.payment_intent}</p>
              <p><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
            </div>

            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;">
                💬 Ogni messaggio costa 2 crediti. Con ${purchase.credits_amount} crediti puoi inviare circa ${Math.floor(purchase.credits_amount / 2)} messaggi!
              </p>
            </div>

            <p>Grazie per il tuo acquisto!</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              I crediti non scadono e rimangono disponibili sul tuo account.
            </p>
          </div>
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