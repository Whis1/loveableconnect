# Stripe payments

The intended merchant is **acct_1TRCboIx1HpVMtEB (Giuseppino Chighini)**,
confirmed by the owner on 13 October 2026. An email/contact field is not used
to route funds. Every Checkout creation verifies this exact account ID and
its ability to accept card payments before opening a payment session.

The previously configured account was acct_1SHXwuK6IHDbrxmE. Its key and
prices must not be used for new charges. Do not remove the account guard to
work around a suspended account; Stripe must first restore its payments.

## Deployment

Apply `supabase/migrations/20261013090000_atomic_stripe_fulfillment.sql`, then
deploy the changed Checkout creators, verification functions and
`stripe-webhook` with the shared `stripe-payments.ts` module.

Cloud environment configuration (never put secret values in Git):

| Variable | Expected product |
| --- | --- |
| STRIPE_SECRET_KEY | Existing live key for the intended merchant |
| STRIPE_WEBHOOK_SECRET | Signing secret for that merchant's LoveableConnect endpoint |
| STRIPE_PRICE_CREDITS_50 | 50 credits, EUR 9.99, one time |
| STRIPE_PRICE_CREDITS_150 | 150 credits, EUR 19.99, one time |
| STRIPE_PRICE_CREDITS_350 | 350 credits, EUR 39.99, one time |
| STRIPE_PRICE_WEEKLY | Weekly, EUR 13.99/week |
| STRIPE_COUPON_WEEKLY_TRIAL | EUR 7.00 discount, duration once |
| STRIPE_PRICE_PLATINUM_MONTHLY | Platinum, EUR 69.99/month |
| STRIPE_PRICE_PREMIUM_MONTHLY | Premium, EUR 399.99/month |
| STRIPE_PRICE_GIFT_SUBSCRIPTION | Gift Premium, EUR 399.99/month |
| STRIPE_PRICE_GIFT_CREDITS_25 | 25 gift credits, EUR 4.99, one time |
| STRIPE_PRICE_GIFT_CREDITS_100 | 100 gift credits, EUR 19.99, one time |
| STRIPE_PRICE_DARKCROW | Dark Crow theme, EUR 9.99, one time |

`STRIPE_PRICE_UNLOCK_LIKES` concerns a legacy feature whose table was removed
by the existing November 2025 migration; leave it unconfigured.

Product names and descriptions must show the same quantity as the delivered
credits. Keep the legacy API keys `credits_130` and `credits_220`: their
current packages deliver 150 and 350 credits respectively. Checkout also
checks the actual Stripe price, EUR currency, live mode and billing interval.

The live webhook URL is
`https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/stripe-webhook`.
Configure these four events on the intended merchant:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- invoice.paid
- customer.subscription.deleted

The Stripe destination already exists as `we_1TYixwIx1HpVMtEBQmBwx3R1`.
Update it rather than creating a duplicate. Keep `verify_jwt=false` for the
webhook; the handler verifies Stripe's signature over the original body.
Test deliveries are acknowledged without granting production benefits.

## Fulfillment

Success pages and the signed webhook use the same server-only RPC. Balance,
purchase status, audit record and deduplication receipt commit atomically.
Duplicate deliveries or concurrent success-page verification cannot grant
the same order twice. Any failed transaction rolls back and can be retried.

Subscription expiry reads Basil's subscription item periods. Renewals use
the paid invoice's own period and cannot reset benefits from a stale invoice
or resurrect an already replaced/deleted subscription. Gift subscription
benefits go to the recipient; gift credit and theme purchases also share
atomic fulfillment. The registered webhook receives account-wide events,
so Checkout and subscription metadata include `app=loveableconnect` and
unrelated product events do not grant rewards.

## Validation

With Node 24 and installed dev dependencies, run `npm run test:payments`.
This uses an isolated PostgreSQL engine (PGlite) and simulated Stripe
objects; it does not charge money or modify the live database. It tests all
three credit packages, all three plans, concurrent/replayed requests,
rollback and retry, renewals, gifts and restricted RPC access.

Also run the frontend build and Deno checks for the changed Edge Functions.
A local simulation does not prove a real card payment or bank payout. A
Stripe sandbox end-to-end test must use an isolated staging database and
test keys. Never send fabricated paid live events to the production webhook.
