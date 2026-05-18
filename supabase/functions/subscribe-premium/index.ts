import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PREMIUM_MONTHLY_PRICE_ID = "price_1SPYDwK6IHDbrxmEMvlzFCAZ";
const STANDARD_MONTHLY_PRICE_ID = "price_1SPYGEK6IHDbrxmEzOUcxEW9";
const PREMIUM_WEEKLY_PRICE_ID = "price_1SNixgK6IHDbrxmEytmu8UU8";
const WEEKLY_TRIAL_COUPON_ID = "OCFRCIQT";

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
    if (!user?.email) throw new Error("User not authenticated");

    // Get subscription type and tier from request body
    const { subscription_type = "monthly", tier = "premium" } = await req.json().catch(() => ({ subscription_type: "monthly", tier: "premium" }));

    if (!["monthly", "weekly"].includes(subscription_type)) {
      throw new Error("Invalid subscription type");
    }
    
    if (subscription_type === "monthly" && !["premium", "standard"].includes(tier)) {
      throw new Error("Invalid subscription tier");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      return new Response(
        JSON.stringify({ error: "You already have an active subscription" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if user has already used weekly trial
    const { data: creditsData } = await supabaseClient
      .from("user_credits")
      .select("has_used_weekly_trial")
      .eq("user_id", user.id)
      .single();

    let priceId: string;
    if (subscription_type === "weekly") {
      priceId = PREMIUM_WEEKLY_PRICE_ID;
    } else {
      priceId = tier === "standard" ? STANDARD_MONTHLY_PRICE_ID : PREMIUM_MONTHLY_PRICE_ID;
    }
    const hasUsedWeeklyTrial = creditsData?.has_used_weekly_trial || false;

    // Build session config
    const sessionConfig: any = {
      customer: customerId,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/premium-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/credits`,
      metadata: {
        user_id: user.id,
        subscription_type: subscription_type,
        tier: subscription_type === "monthly" ? tier : "none",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          subscription_type: subscription_type,
          tier: subscription_type === "monthly" ? tier : "none",
        },
      },
    };

    // Apply trial coupon for weekly subscription if not used yet
    if (subscription_type === "weekly" && !hasUsedWeeklyTrial) {
      sessionConfig.discounts = [{
        coupon: WEEKLY_TRIAL_COUPON_ID,
      }];
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update user credits with customer ID
    const { error: upsertErr } = await supabaseClient
      .from("user_credits")
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
      }, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("Error upserting stripe_customer_id:", upsertErr);
      throw new Error(`Failed to save customer id: ${upsertErr.message}`);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in subscribe-premium:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});