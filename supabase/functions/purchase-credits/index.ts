import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDIT_PACKAGES: Record<string, { price_id: string; credits: number; amount: number }> = {
  credits_50: {
    price_id: "price_1SIchHK6IHDbrxmEQkyoofLd",
    credits: 50,
    amount: 999,
  },
  credits_75: {
    price_id: "price_1SIchWK6IHDbrxmEnn9I5Vhf",
    credits: 75,
    amount: 1999,
  },
  credits_100: {
    price_id: "price_1SIchiK6IHDbrxmEZGwUz0U5",
    credits: 100,
    amount: 2999,
  },
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
    if (!user?.email) throw new Error("User not authenticated");

    const { package_type } = await req.json();
    const packageInfo = CREDIT_PACKAGES[package_type];
    
    if (!packageInfo) {
      throw new Error("Invalid package type");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{
        price: packageInfo.price_id,
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/credits`,
      metadata: {
        user_id: user.id,
        package_type,
        credits_amount: packageInfo.credits.toString(),
      },
    });

    // Create pending purchase record
    await supabaseClient.from("purchases").insert({
      user_id: user.id,
      product_type: package_type,
      amount_cents: packageInfo.amount,
      currency: "eur",
      credits_amount: packageInfo.credits,
      stripe_session_id: session.id,
      status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in purchase-credits:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});