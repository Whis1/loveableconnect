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

## Production status — 13 October 2026

The code commit cb948db was pushed to main and deployed on Vercel. Lovable Cloud applied the exact SQL migration (recorded by its tool under drizzle/migrations/0000_atomic_stripe_fulfillment.sql) and deployed all 12 functions from the verified source bundle. GitHub sync in Lovable has lost Whis1 access, so future backend deploys must not assume that a push is automatically imported.

The owner approved connecting the existing live restricted key for acct_1TRCboIx1HpVMtEB. It is saved through the official Update Stripe secret key form. Accounts Read was explicitly approved, added and checked after saving; other resource permissions were preserved. The existing signing secret for we_1TYixwIx1HpVMtEBQmBwx3R1 was saved in Cloud. Do not create or rotate keys to repeat this setup.

A production request at 09:59:53 Europe/Rome confirmed the intended account ID and charges_enabled=false. The merchant guard returns 503 while Stripe suspends payments. Stripe must restore the account; do not remove this guard. Climate on the intended account is not activated.

An online HMAC probe with type codex.signature_probe and livemode=false returned 200, received=true, ignored=test_event. The same harmless probe with an invalid signature returned 400. This verifies the configured webhook secret and signature validation, not a real payment or bank payout. The 15 isolated PostgreSQL tests, frontend build and Deno checks passed.

Configured live catalog IDs (these are identifiers, not credentials):

| Environment variable | Value |
| --- | --- |
| STRIPE_PRICE_CREDITS_50 | price_1UPzjcIx1HpVMtEBHhhDO1iM |
| STRIPE_COUPON_WEEKLY_TRIAL | licezDWN |
| STRIPE_PRICE_CREDITS_150 | price_1UPzlIIx1HpVMtEBEp1QRv9H |
| STRIPE_PRICE_CREDITS_350 | price_1UQ061Ix1HpVMtEBod1DmCCq |
| STRIPE_PRICE_PLATINUM_MONTHLY | price_1UPzzQIx1HpVMtEBjZPglSd8 |
| STRIPE_PRICE_PREMIUM_MONTHLY | price_1UQ07zIx1HpVMtEB1Ugga0ad |
| STRIPE_PRICE_GIFT_SUBSCRIPTION | price_1UQ07zIx1HpVMtEB1Ugga0ad |
| STRIPE_PRICE_WEEKLY | price_1UQ09xIx1HpVMtEBxPlKI60G |
| STRIPE_PRICE_GIFT_CREDITS_25 | price_1UQ0HAIx1HpVMtEB5xRXIkaN |
| STRIPE_PRICE_GIFT_CREDITS_100 | price_1UQ0HeIx1HpVMtEBsdfi0Tbs |
| STRIPE_PRICE_DARKCROW | price_1UQ0I8Ix1HpVMtEBPjAivzkp |

The gift Premium flow uses the same 399.99/month Premium price, with gift metadata assigning benefits to the recipient. No payment, live subscription, payout or production test benefit was created. A real or isolated Stripe sandbox end-to-end payment remains unverified.
