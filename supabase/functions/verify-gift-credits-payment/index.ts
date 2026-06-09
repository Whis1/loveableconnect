import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service role: deve scrivere user_credits.gift_credits e il registro acquisti.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Session ID required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata?.user_id && session.metadata.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Session does not belong to this user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const credits = parseInt(session.metadata?.gift_credits || "0", 10);
    if (!credits || credits <= 0) throw new Error("Invalid gift credits amount");

    // Idempotenza: una checkout session accredita UNA volta sola.
    const { error: insErr } = await supabase
      .from("gift_credit_purchases")
      .insert({ session_id, user_id: user.id, credits });
    if (insErr) {
      // Violazione di chiave primaria = gia' accreditata in precedenza.
      return new Response(
        JSON.stringify({ success: true, credits, already_granted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Accredita i crediti regalo (riga creata se l'utente non ne ha una).
    const { data: row } = await supabase
      .from("user_credits")
      .select("gift_credits")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row) {
      const { error: updErr } = await supabase
        .from("user_credits")
        .update({ gift_credits: ((row as any).gift_credits || 0) + credits })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
    } else {
      const { error: newErr } = await supabase
        .from("user_credits")
        .insert({ user_id: user.id, gift_credits: credits });
      if (newErr) throw newErr;
    }

    return new Response(
      JSON.stringify({ success: true, credits, already_granted: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in verify-gift-credits-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
