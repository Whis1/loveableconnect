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
        from: "Love App <onboarding@resend.dev>",
        to: [user.email!],
        subject: "💕 Likes Sbloccati per 24 Ore!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ec4899;">💕 Likes Sbloccati!</h1>
            <p>Ciao,</p>
            <p>Hai sbloccato con successo l'accesso ai tuoi likes ricevuti!</p>
            
            <div style="background: #fce7f3; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #9f1239;">Dettagli Sblocco</h2>
              <p><strong>Importo:</strong> €2.99</p>
              <p><strong>Durata:</strong> 24 ore</p>
              <p><strong>Valido fino:</strong> ${expiresAt.toLocaleString('it-IT')}</p>
              <p><strong>ID Pagamento:</strong> ${session.payment_intent}</p>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                ✨ Ora puoi vedere chi ha messo like al tuo profilo e iniziare a chattare!
              </p>
            </div>

            <p>Approfitta delle prossime 24 ore per scoprire i tuoi ammiratori!</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Dopo 24 ore l'accesso ai likes tornerà limitato. Considera l'abbonamento Premium per accesso illimitato!
            </p>
          </div>
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
