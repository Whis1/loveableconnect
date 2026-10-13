import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { fulfillCheckout, fulfillInvoice, requirePaymentAccount, PAYMENT_REVISION } from "../_shared/stripe-payments.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } });
const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body),
  { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST") return json({ revision: PAYMENT_REVISION, error: "Method not allowed" }, 405);
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return json({ error: "Missing signature or secret" }, 400);
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret); }
  catch { return json({ error: "Invalid signature" }, 400); }

  // Dashboard test deliveries never assign production credits or subscriptions.
  if (!event.livemode) return json({ received: true, ignored: "test_event", revision: PAYMENT_REVISION });
  try {
    // Previously paid orders may still be fulfilled if Stripe suspends new charges.
    await requirePaymentAccount(stripe, true);
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
        if (session.payment_status !== "paid" || session.metadata?.app !== "loveableconnect") break;
        await fulfillCheckout(stripe, supabase, session, key);
        break;
      }
      case "invoice.paid":
        // Normalize new webhook API versions through this SDK's pinned version.
        await fulfillInvoice(stripe, supabase, await stripe.invoices.retrieve(event.data.object.id));
        break;
      case "customer.subscription.deleted": {
        const { error } = await supabase.rpc("end_stripe_subscription", { _subscription_id: event.data.object.id });
        if (error) throw error;
        break;
      }
    }
    console.log("[STRIPE-WEBHOOK] Processed", { id: event.id, type: event.type, revision: PAYMENT_REVISION });
    return json({ received: true, revision: PAYMENT_REVISION });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Retry required", { id: event.id, type: event.type,
      error: error instanceof Error ? error.message : String(error) });
    return json({ error: "Payment fulfillment failed; delivery will be retried", revision: PAYMENT_REVISION }, 500);
  }
});
