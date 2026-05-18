import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${s}`);
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

function planBenefits(subscriptionType: string, tier: string) {
  if (subscriptionType === "weekly") {
    return { balance: 40, daily_likes_remaining: 30, daily_free_chats_remaining: 5 };
  }
  if (subscriptionType === "monthly" && tier === "standard") {
    return { balance: 70, daily_likes_remaining: 40, daily_free_chats_remaining: 0 };
  }
  // monthly premium (default)
  return { balance: 999999, daily_likes_remaining: 999999, daily_free_chats_remaining: 999999 };
}

async function processCheckoutPayment(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const packageType = session.metadata?.package_type;
  const creditsAmount = parseInt(session.metadata?.credits_amount || "0", 10);
  if (!userId || !creditsAmount) {
    log("Missing payment metadata, skipping", { sessionId: session.id });
    return;
  }

  // Idempotency: lookup existing purchase
  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing?.status === "completed") {
    log("Already completed", { sessionId: session.id });
    return;
  }

  // Upsert purchase as completed
  const purchasePayload = {
    user_id: userId,
    product_type: packageType,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "eur",
    credits_amount: creditsAmount,
    stripe_session_id: session.id,
    stripe_payment_intent_id: (session.payment_intent as string) ?? null,
    status: "completed",
    completed_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("purchases")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        stripe_payment_intent_id: (session.payment_intent as string) ?? null,
      })
      .eq("id", existing.id);
    if (error) throw new Error(`update purchase: ${error.message}`);
  } else {
    const { error } = await supabase.from("purchases").insert(purchasePayload);
    if (error && !String(error.message).includes("duplicate")) throw new Error(`insert purchase: ${error.message}`);
  }

  // Add credits
  const { data: uc, error: readErr } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(`read credits: ${readErr.message}`);

  const newBalance = (uc?.balance ?? 16) + creditsAmount;
  if (uc) {
    const { error } = await supabase
      .from("user_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) throw new Error(`update credits: ${error.message}`);
  } else {
    const { error } = await supabase.from("user_credits").insert({ user_id: userId, balance: newBalance });
    if (error) throw new Error(`insert credits: ${error.message}`);
  }

  // Log transaction
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: creditsAmount,
    transaction_type: "purchase",
    reason: `Purchased ${creditsAmount} credits (webhook)`,
  });

  log("Credits accredited via webhook", { userId, creditsAmount, newBalance });
}

async function processCheckoutSubscription(session: Stripe.Checkout.Session) {
  const isGift = session.metadata?.is_gift === "true";
  if (isGift) return processGift(session);

  const userId = session.metadata?.user_id;
  const subscriptionType = session.metadata?.subscription_type || "monthly";
  const tier = session.metadata?.tier || "premium";
  if (!userId) {
    log("Missing user_id in subscription session, skipping", { sessionId: session.id });
    return;
  }

  // Idempotency
  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing?.status === "completed") {
    log("Subscription already processed", { sessionId: session.id });
    return;
  }

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const benefits = planBenefits(subscriptionType, tier);
  const isWeekly = subscriptionType === "weekly";

  const updateData: Record<string, unknown> = {
    user_id: userId,
    is_premium: true,
    premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    stripe_subscription_id: subscriptionId,
    subscription_type: subscriptionType,
    premium_tier: subscriptionType === "monthly" ? tier : "none",
    balance: benefits.balance,
    daily_likes_remaining: benefits.daily_likes_remaining,
    daily_free_chats_remaining: benefits.daily_free_chats_remaining,
    credits_depleted_at: null,
    updated_at: new Date().toISOString(),
  };
  if (isWeekly) updateData.has_used_weekly_trial = true;

  const { error: ucErr } = await supabase
    .from("user_credits")
    .upsert(updateData, { onConflict: "user_id" });
  if (ucErr) throw new Error(`upsert user_credits: ${ucErr.message}`);

  let productType = "premium_monthly";
  if (isWeekly) productType = "premium_weekly";
  else if (subscriptionType === "monthly" && tier === "standard") productType = "standard_monthly";

  const { error: purErr } = await supabase.from("purchases").insert({
    user_id: userId,
    product_type: productType,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "eur",
    stripe_payment_intent_id: (session.payment_intent as string) ?? null,
    stripe_session_id: session.id,
    status: "completed",
    completed_at: new Date().toISOString(),
  });
  if (purErr && !String(purErr.message).includes("duplicate")) {
    throw new Error(`insert purchase: ${purErr.message}`);
  }

  log("Subscription activated via webhook", { userId, subscriptionType, tier });
}

async function processGift(session: Stripe.Checkout.Session) {
  const recipientId = session.metadata?.gift_recipient_id;
  const senderId = session.metadata?.gift_sender_id;
  if (!recipientId) {
    log("Missing gift_recipient_id, skipping");
    return;
  }

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing?.status === "completed") return;

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { error: ucErr } = await supabase
    .from("user_credits")
    .upsert({
      user_id: recipientId,
      is_premium: true,
      premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      stripe_subscription_id: subscriptionId,
      subscription_type: "monthly",
      premium_tier: "premium",
      balance: 999999,
      daily_likes_remaining: 999999,
      daily_free_chats_remaining: 999999,
      credits_depleted_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (ucErr) throw new Error(`upsert gift credits: ${ucErr.message}`);

  await supabase
    .from("subscription_gifts")
    .update({
      stripe_subscription_id: subscriptionId,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id);

  const { error: purErr } = await supabase.from("purchases").insert({
    user_id: senderId,
    product_type: "gift_premium_monthly",
    amount_cents: session.amount_total ?? 29999,
    currency: session.currency ?? "eur",
    stripe_payment_intent_id: (session.payment_intent as string) ?? null,
    stripe_session_id: session.id,
    status: "completed",
    completed_at: new Date().toISOString(),
  });
  if (purErr && !String(purErr.message).includes("duplicate")) {
    throw new Error(`insert gift purchase: ${purErr.message}`);
  }

  log("Gift activated via webhook", { recipientId, senderId });
}

async function processInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  // First invoice is handled by checkout.session.completed. Skip if billing_reason indicates creation.
  if (invoice.billing_reason === "subscription_create") {
    log("Skipping initial invoice", { invoiceId: invoice.id });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id;
  const subscriptionType = subscription.metadata?.subscription_type || "monthly";
  const tier = subscription.metadata?.tier || "premium";
  if (!userId) {
    log("Subscription missing user_id metadata, cannot extend", { subscriptionId });
    return;
  }

  const benefits = planBenefits(subscriptionType, tier);

  const { error } = await supabase
    .from("user_credits")
    .upsert({
      user_id: userId,
      is_premium: true,
      premium_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      stripe_subscription_id: subscriptionId,
      subscription_type: subscriptionType,
      premium_tier: subscriptionType === "monthly" ? tier : "none",
      balance: benefits.balance,
      daily_likes_remaining: benefits.daily_likes_remaining,
      daily_free_chats_remaining: benefits.daily_free_chats_remaining,
      credits_depleted_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) throw new Error(`renewal upsert: ${error.message}`);

  log("Subscription renewed", { userId, subscriptionId });
}

async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;
  const { error } = await supabase
    .from("user_credits")
    .update({
      is_premium: false,
      subscription_type: "none",
      premium_tier: "none",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) log("ERROR clearing subscription", { error });
  else log("Subscription cleared", { userId });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing signature or secret" }), { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    log("Signature verification failed", { err: String(err) });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid" && session.mode !== "subscription") {
          log("Session not paid, skipping", { sessionId: session.id });
          break;
        }
        if (session.mode === "payment") await processCheckoutPayment(session);
        else if (session.mode === "subscription") await processCheckoutSubscription(session);
        break;
      }
      case "invoice.paid": {
        await processInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case "customer.subscription.deleted": {
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        log("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR processing event", { type: event.type, msg });
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});