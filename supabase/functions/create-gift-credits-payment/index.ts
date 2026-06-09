import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🎁 Pacchetti di CREDITI REGALO (saldo separato, usabile solo per i regali in chat).
//    Sostituire i price ID con quelli creati su Stripe.
const GIFT_PACKS: Record<string, { priceId: string; credits: number }> = {
  small: { priceId: "price_1TgYdcK6IHDbrxmEss7xbq7P", credits: 25 },  // 4,99 €
  big: { priceId: "price_1TgYeHK6IHDbrxmECCYJlpXM", credits: 100 },  // 19,99 €
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { pack } = await req.json();
    const chosen = GIFT_PACKS[pack as string];
    if (!chosen) throw new Error("Unknown gift pack");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "https://loveableconnect.it";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: chosen.priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/?gift_credits_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?gift_credits_purchase=cancel`,
      metadata: {
        user_id: user.id,
        gift_pack: pack,
        gift_credits: String(chosen.credits),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating gift credits payment:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
