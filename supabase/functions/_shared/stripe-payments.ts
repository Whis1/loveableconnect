// Shared by Checkout creation, the success pages and the signed webhook.
// Keep money amounts in cents and legacy package keys stable for existing orders.
export const PAYMENT_REVISION = "2026-10-13-atomic-stripe-v1";
export const STRIPE_ACCOUNT_ID = "acct_1TRCboIx1HpVMtEB";
export const CREDIT_PACKAGES = {
  credits_50: { credits: 50, amount: 999, env: "STRIPE_PRICE_CREDITS_50" },
  credits_130: { credits: 150, amount: 1999, env: "STRIPE_PRICE_CREDITS_150" },
  credits_220: { credits: 350, amount: 3999, env: "STRIPE_PRICE_CREDITS_350" },
} as const;

type JsonObject = Record<string, any>;
type StripeClient = {
  accounts: { retrieve: () => Promise<JsonObject> };
  subscriptions: { retrieve: (id: string) => Promise<JsonObject> };
};
type DatabaseClient = {
  rpc: (name: string, args: JsonObject) => PromiseLike<{ data: any; error: any }>;
};

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function stripeId(value: any): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function requirePaymentAccount(stripe: StripeClient, allowSuspended = false): Promise<void> {
  const account = await stripe.accounts.retrieve();
  if (account.id !== STRIPE_ACCOUNT_ID || (!allowSuspended && (!account.charges_enabled ||
      account.capabilities?.card_payments !== "active"))) {
    console.error("[STRIPE] Checkout unavailable", {
      account_id: account.id, expected_account_id: STRIPE_ACCOUNT_ID,
      charges_enabled: account.charges_enabled,
    });
    throw new PaymentError("I pagamenti sono temporaneamente non disponibili. Riprova più tardi.", 503);
  }
}

export function requirePrice(getEnv: (key: string) => string | undefined, name: string): string {
  const price = getEnv(name);
  if (!price?.startsWith("price_")) {
    throw new PaymentError("I pagamenti sono temporaneamente non disponibili. Riprova più tardi.", 503);
  }
  return price;
}

export async function configuredPrice(
  stripe: { prices: { retrieve: (id: string) => Promise<JsonObject> } },
  getEnv: (key: string) => string | undefined, name: string, amount: number, interval?: string,
): Promise<string> {
  const id = requirePrice(getEnv, name);
  const price = await stripe.prices.retrieve(id);
  if (!price.active || !price.livemode || price.currency !== "eur" || price.unit_amount !== amount ||
      (interval ? price.recurring?.interval !== interval || price.recurring?.interval_count !== 1 : !!price.recurring)) {
    throw new PaymentError("I pagamenti sono temporaneamente non disponibili. Riprova più tardi.", 503);
  }
  return id;
}

export function assertPaidSession(session: JsonObject, secretKey: string, buyerId?: string): void {
  if (!session.id?.startsWith("cs_") || session.status !== "complete" || session.payment_status !== "paid") {
    throw new PaymentError("Payment not completed");
  }
  // Test events/keys must never credit a real production purchase.
  const liveKey = secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_");
  if (!liveKey || session.livemode !== true) {
    throw new PaymentError("Stripe mode mismatch");
  }
  const metadataBuyer = session.metadata?.is_gift === "true"
    ? session.metadata?.gift_sender_id : session.metadata?.user_id;
  if (!metadataBuyer || (buyerId && metadataBuyer !== buyerId)) {
    throw new PaymentError("Session does not belong to this user", 403);
  }
}

export function subscriptionPeriodEnd(subscription: JsonObject): string {
  // Basil moved the billing period from Subscription to SubscriptionItem.
  const items = subscription.items?.data ?? [];
  const ends = items.map((item: JsonObject) => item.current_period_end)
    .filter((end: any) => Number.isSafeInteger(end) && end > 0);
  const end = ends.length ? Math.min(...ends) : subscription.current_period_end;
  if (!Number.isSafeInteger(end) || end <= 0) throw new PaymentError("Missing subscription period", 502);
  return new Date(end * 1000).toISOString();
}

export function invoiceSubscriptionId(invoice: JsonObject): string | null {
  return stripeId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
}

export function planBenefits(type: string, tier: string): JsonObject {
  if (type === "weekly") return { balance: 26, likes: 10, free_chats: 5 };
  if (type === "monthly" && tier === "standard") return { balance: 40, likes: 20, free_chats: 0 };
  if (type === "monthly" && tier === "premium") return { balance: 999999, likes: 999999, free_chats: 999999 };
  throw new PaymentError("Invalid subscription plan");
}

function subscriptionDetails(subscription: JsonObject, buyerId: string, recipientId: string, isGift: boolean): JsonObject {
  if (!["active", "trialing"].includes(subscription.status)) {
    throw new PaymentError("Subscription is not active");
  }
  const metadata = subscription.metadata ?? {};
  if (isGift ? (metadata.gift_sender_id !== buyerId || metadata.gift_recipient_id !== recipientId || metadata.is_gift !== "true")
    : metadata.user_id !== buyerId) {
    throw new PaymentError("Subscription ownership mismatch", 403);
  }
  const type = isGift ? "monthly" : metadata.subscription_type;
  const tier = isGift ? "premium" : type === "weekly" ? "none" : metadata.tier;
  return { subscription_id: subscription.id, subscription_type: type, tier,
    expires_at: subscriptionPeriodEnd(subscription), ...planBenefits(type, tier) };
}

export async function fulfillCheckout(
  stripe: StripeClient, db: DatabaseClient, session: JsonObject, secretKey: string,
  buyerId?: string, expectedKind?: string,
): Promise<JsonObject> {
  assertPaidSession(session, secretKey, buyerId);
  const meta = session.metadata;
  const gift = meta.is_gift === "true";
  const buyer = gift ? meta.gift_sender_id : meta.user_id;
  const payment: JsonObject = {
    session_id: session.id, buyer_id: buyer, beneficiary_id: buyer,
    amount_cents: session.amount_total, currency: session.currency,
    payment_intent_id: stripeId(session.payment_intent), customer_id: stripeId(session.customer),
    livemode: session.livemode,
  };
  if (session.currency !== "eur" || !Number.isSafeInteger(session.amount_total) || session.amount_total <= 0) {
    throw new PaymentError("Invalid purchase amount");
  }
  if (session.mode === "subscription") {
    const subId = stripeId(session.subscription);
    if (!subId) throw new PaymentError("Missing subscription");
    const recipient = gift ? meta.gift_recipient_id : buyer;
    if (!recipient) throw new PaymentError("Missing gift recipient");
    const sub = await stripe.subscriptions.retrieve(subId);
    Object.assign(payment, { kind: "subscription", beneficiary_id: recipient, is_gift: gift },
      subscriptionDetails(sub, buyer, recipient, gift));
    payment.product_type = gift ? "gift_premium_monthly" : payment.subscription_type === "weekly"
      ? "premium_weekly" : payment.tier === "standard" ? "standard_monthly" : "premium_monthly";
  } else if (session.mode === "payment" && Object.hasOwn(CREDIT_PACKAGES, meta.package_type)) {
    const pack = CREDIT_PACKAGES[meta.package_type as keyof typeof CREDIT_PACKAGES];
    if (session.amount_total !== pack.amount || Number(meta.credits_amount) !== pack.credits) {
      throw new PaymentError("Credit package does not match the paid order");
    }
    Object.assign(payment, { kind: "credits", credits: pack.credits, product_type: meta.package_type });
  } else if (session.mode === "payment" && ["small", "big"].includes(meta.gift_pack)) {
    const pack = meta.gift_pack === "small" ? { credits: 25, amount: 499 } : { credits: 100, amount: 1999 };
    if (Number(meta.gift_credits) !== pack.credits || session.amount_total !== pack.amount) {
      throw new PaymentError("Gift credit package does not match the paid order");
    }
    Object.assign(payment, { kind: "gift_credits", credits: pack.credits });
  } else if (session.mode === "payment" && meta.theme === "darkcrow" && session.amount_total === 999) {
    Object.assign(payment, { kind: "theme", theme: "darkcrow" });
  } else {
    throw new PaymentError("Unknown paid product");
  }
  if (expectedKind && payment.kind !== expectedKind) throw new PaymentError("Unexpected purchase type");
  const { data, error } = await db.rpc("fulfill_stripe_checkout", { _payment: payment });
  if (error) throw new PaymentError(`Fulfillment failed: ${error.message}`, 500);
  return { ...data, kind: payment.kind, credits: payment.credits,
    subscription_type: payment.subscription_type, tier: payment.tier, expires_at: payment.expires_at,
    recipient_id: payment.beneficiary_id, sender_id: payment.buyer_id, theme: payment.theme };
}

export async function fulfillInvoice(stripe: StripeClient, db: DatabaseClient, invoice: JsonObject): Promise<void> {
  const id = invoiceSubscriptionId(invoice);
  if (!id || invoice.status !== "paid" || invoice.billing_reason === "subscription_create") return;
  const sub = await stripe.subscriptions.retrieve(id);
  const meta = sub.metadata ?? {};
  if (meta.app !== "loveableconnect") return;
  const gift = meta.is_gift === "true";
  const buyer = gift ? meta.gift_sender_id : meta.user_id;
  const recipient = gift ? meta.gift_recipient_id : buyer;
  if (!buyer || !recipient) throw new PaymentError("Missing renewal owner", 500);
  const details = subscriptionDetails(sub, buyer, recipient, gift);
  // Use the paid invoice's own period, not a later period returned by a fresh
  // Subscription retrieval when old webhook deliveries arrive out of order.
  const ends = (invoice.lines?.data ?? []).filter((line: JsonObject) =>
    stripeId(line.parent?.subscription_item_details?.subscription ?? line.subscription) === id)
    .map((line: JsonObject) => line.period?.end).filter((end: any) => Number.isSafeInteger(end) && end > 0);
  if (!ends.length) throw new PaymentError("Missing paid invoice period", 500);
  details.expires_at = new Date(Math.min(...ends) * 1000).toISOString();
  const { error } = await db.rpc("renew_stripe_subscription", { _renewal: {
    invoice_id: invoice.id, beneficiary_id: recipient, buyer_id: buyer,
    ...details,
  } });
  if (error) throw new PaymentError(`Renewal failed: ${error.message}`, 500);
}

export function paymentFailure(error: unknown, headers: Record<string, string>): Response {
  const status = error instanceof PaymentError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Payment processing failed";
  console.error("[STRIPE]", { status, message });
  return new Response(JSON.stringify({ success: false, error: message }), {
    status, headers: { ...headers, "Content-Type": "application/json" },
  });
}
