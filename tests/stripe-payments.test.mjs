import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { fulfillCheckout, fulfillInvoice, assertPaidSession, requirePaymentAccount,
  subscriptionPeriodEnd, invoiceSubscriptionId, STRIPE_ACCOUNT_ID, configuredPrice } from '../supabase/functions/_shared/stripe-payments.ts';

// PostgreSQL in an isolated local runtime; no live database, Stripe key or charge.
const migration = await fs.readFile(new URL('../supabase/migrations/20261013090000_atomic_stripe_fulfillment.sql',import.meta.url),'utf8');
const baseMigration = await fs.readFile(new URL('../supabase/migrations/20251015215700_ce7472fe-bffe-4cb3-bf90-550585c3dcee.sql',import.meta.url),'utf8');
const buyer='00000000-0000-4000-8000-000000000001', recipient='00000000-0000-4000-8000-000000000002';
const key='sk_live_local_fixture_only';
let n=0;
function checkout(meta={user_id:buyer,package_type:'credits_130',credits_amount:'150'}, amount=1999) {
  return {id:'cs_live_fixture_'+(++n),status:'complete',payment_status:'paid',livemode:true,
    mode:'payment',currency:'eur',amount_total:amount,payment_intent:'pi_fixture_'+n,customer:'cus_fixture',metadata:meta};
}
function subscription(type='weekly',tier='none',gift=false) {
  return {id:'sub_fixture_'+(++n),status:'active',items:{data:[{current_period_end:Math.floor(Date.now()/1000)+86400*30}]},
    metadata:gift?{is_gift:'true',gift_sender_id:buyer,gift_recipient_id:recipient}:
      {app:'loveableconnect',user_id:buyer,subscription_type:type,tier}};
}
async function database() {
  const pg=new PGlite();
  await pg.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    INSERT INTO auth.users VALUES('${buyer}'),('${recipient}');`);
  await pg.exec(baseMigration.split('-- Create function to reset daily credits')[0]);
  await pg.exec(`ALTER TABLE user_credits ADD COLUMN subscription_type text DEFAULT 'none',
    ADD COLUMN premium_tier text DEFAULT 'none',ADD COLUMN daily_likes_remaining integer DEFAULT 5,
    ADD COLUMN daily_free_chats_remaining integer DEFAULT 0, ADD COLUMN has_used_weekly_trial boolean DEFAULT false,
    ADD COLUMN credits_depleted_at timestamptz, ADD COLUMN daily_likes_reset_at timestamptz,
    ADD COLUMN daily_free_chats_reset_at timestamptz, ADD COLUMN gift_credits integer NOT NULL DEFAULT 0;
    ALTER TABLE purchases DROP CONSTRAINT purchases_product_type_check;
    ALTER TABLE purchases ADD CONSTRAINT purchases_product_type_check CHECK(product_type IN
      ('credits_50','credits_130','credits_220','premium_monthly','standard_monthly','premium_weekly','gift_premium_monthly'));
    CREATE UNIQUE INDEX purchases_session ON purchases(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
    CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth.users,owned_themes text[] NOT NULL DEFAULT '{}',profile_theme text DEFAULT 'none');
    CREATE TABLE gift_credit_purchases(session_id text PRIMARY KEY,user_id uuid NOT NULL,credits integer NOT NULL);
    CREATE TABLE subscription_gifts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),gifter_id uuid NOT NULL,
      recipient_id uuid NOT NULL,stripe_session_id text NOT NULL,status text DEFAULT 'pending',
      stripe_subscription_id text,completed_at timestamptz);
    INSERT INTO user_credits(user_id,balance) VALUES('${buyer}',10),('${recipient}',10);
    INSERT INTO profiles(id) VALUES('${buyer}'),('${recipient}');`);
  await pg.exec(migration);
  const db={rpc:async(name,args)=>{
    try { const entries=Object.entries(args); const q=await pg.query(`SELECT public.${name}($1) AS result`,[entries[0][1]]);
      return {data:q.rows[0].result,error:null}; }
    catch(error){return {data:null,error};}
  }};
  return {pg,db,row:async(id=buyer)=>(await pg.query('SELECT * FROM user_credits WHERE user_id=$1',[id])).rows[0]};
}
const stripeFor=sub=>({accounts:{retrieve:async()=>({id:STRIPE_ACCOUNT_ID,charges_enabled:true,capabilities:{card_payments:'active'}})},
  subscriptions:{retrieve:async id=>{assert.equal(id,sub.id);return sub;}}});

test('account guard rejects the old merchant and the suspended destination',async()=>{
  for(const account of [{id:'acct_1SHXwuK6IHDbrxmE',charges_enabled:true,capabilities:{card_payments:'active'}},
    {id:STRIPE_ACCOUNT_ID,charges_enabled:false,capabilities:{card_payments:'inactive'}}]) {
    await assert.rejects(()=>requirePaymentAccount({accounts:{retrieve:async()=>account}}),{status:503});
  }
  await requirePaymentAccount(stripeFor({}));
});
test('unpaid, incomplete, test-mode and foreign-owned sessions never fulfill',()=>{
  const s=checkout();
  for(const change of [{payment_status:'unpaid'},{status:'open'},{livemode:false},{metadata:{}},
    {metadata:{user_id:recipient}}]) assert.throws(()=>assertPaidSession({...s,...change},key,buyer));
  assert.throws(()=>assertPaidSession(s,'sk_test_fixture',buyer));
});
test('Checkout rejects catalog prices with the wrong amount, currency, mode or recurrence',async()=>{
  const base={active:true,livemode:true,currency:'eur',unit_amount:1999,recurring:null};
  for(const change of [{active:false},{livemode:false},{currency:'usd'},{unit_amount:999},
    {recurring:{interval:'month',interval_count:1}}]) {
    await assert.rejects(()=>configuredPrice({prices:{retrieve:async()=>({...base,...change})}},()=> 'price_fixture','catalog',1999),{status:503});
  }
  assert.equal(await configuredPrice({prices:{retrieve:async()=>base}},()=> 'price_fixture','catalog',1999),'price_fixture');
});
test('Basil and legacy period/invoice fields are read correctly; malformed periods fail',()=>{
  const sub=subscription(); assert.ok(subscriptionPeriodEnd(sub).endsWith('Z'));
  assert.equal(subscriptionPeriodEnd({current_period_end:2000000000}),'2033-05-18T03:33:20.000Z');
  assert.throws(()=>subscriptionPeriodEnd({items:{data:[]}}));
  assert.equal(invoiceSubscriptionId({parent:{subscription_details:{subscription:{id:'sub_new'}}}}),'sub_new');
  assert.equal(invoiceSubscriptionId({subscription:'sub_old'}),'sub_old');
});
for(const [pack,credits,amount] of [['credits_50',50,999],['credits_130',150,1999],['credits_220',350,3999]])
test(`${credits} paid credits are granted without a browser redirect, once only`,async()=>{
  const {pg,db,row}=await database(); try {
    const s=checkout({user_id:buyer,package_type:pack,credits_amount:String(credits)},amount);
    const results=await Promise.all([fulfillCheckout(stripeFor({}),db,s,key),fulfillCheckout(stripeFor({}),db,s,key,buyer,'credits')]);
    assert.equal(results.filter(r=>!r.already_processed).length,1);
    assert.equal((await row()).balance,10+credits);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM credit_transactions')).rows[0].n,1);
    assert.equal((await pg.query('SELECT status FROM purchases')).rows[0].status,'completed');
  } finally {await pg.close();}
});
test('two distinct purchases increment the same balance without losing credits',async()=>{
  const {pg,db,row}=await database(); try {
    await Promise.all([1,2].map(()=>fulfillCheckout(stripeFor({}),db,checkout(),key)));
    assert.equal((await row()).balance,310);
  } finally {await pg.close();}
});
test('database failure rolls back benefits, order completion and receipt; retry succeeds',async()=>{
  const {pg,db,row}=await database(); try {
    const s=checkout();
    await pg.query(`INSERT INTO purchases(user_id,product_type,amount_cents,currency,credits_amount,stripe_session_id)
      VALUES($1,'credits_130',1999,'eur',150,$2)`,[buyer,s.id]);
    await pg.exec(`CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END; $$;
      CREATE TRIGGER reject_audit BEFORE INSERT ON credit_transactions FOR EACH ROW EXECUTE FUNCTION reject_audit();`);
    await assert.rejects(()=>fulfillCheckout(stripeFor({}),db,s,key),{status:500});
    assert.equal((await row()).balance,10);
    assert.equal((await pg.query('SELECT status FROM purchases')).rows[0].status,'pending');
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM stripe_fulfillment_receipts')).rows[0].n,0);
    await pg.exec('DROP TRIGGER reject_audit ON credit_transactions');
    await fulfillCheckout(stripeFor({}),db,s,key); assert.equal((await row()).balance,160);
  } finally {await pg.close();}
});
for(const [type,tier,balance,likes,chats] of [['weekly','none',26,10,5],['monthly','standard',40,20,0],['monthly','premium',999999,999999,999999]])
test(`${type}/${tier}: activation and replay preserve the purchased benefits`,async()=>{
  const {pg,db,row}=await database(); try {
    const sub=subscription(type,tier); const s={...checkout({user_id:buyer},type==='weekly'?699:tier==='standard'?6999:39999),mode:'subscription',subscription:sub.id};
    await fulfillCheckout(stripeFor(sub),db,s,key);
    const result=await row(); assert.equal(result.is_premium,true); assert.equal(result.balance,balance);
    assert.equal(result.daily_likes_remaining,likes); assert.equal(result.daily_free_chats_remaining,chats);
    assert.ok(new Date(result.premium_expires_at)>new Date());
    await pg.query('UPDATE user_credits SET balance=balance-2 WHERE user_id=$1',[buyer]);
    await fulfillCheckout(stripeFor(sub),db,s,key,buyer,'subscription'); assert.equal((await row()).balance,balance-2);
  } finally {await pg.close();}
});
test('paid renewals extend once; delayed older invoices never reset spent credits',async()=>{
  const {pg,db,row}=await database(); try {
    const sub=subscription(); const s={...checkout({user_id:buyer},699),mode:'subscription',subscription:sub.id};
    await fulfillCheckout(stripeFor(sub),db,s,key);
    const end=sub.items.data[0].current_period_end+86400*7;
    const inv={id:'in_fixture_new',status:'paid',billing_reason:'subscription_cycle',parent:{subscription_details:{subscription:sub.id}},
      lines:{data:[{parent:{subscription_item_details:{subscription:sub.id}},period:{end}}]}};
    sub.items.data[0].current_period_end=end+86400*7;
    await fulfillInvoice(stripeFor(sub),db,inv); assert.equal(new Date((await row()).premium_expires_at).getTime(),end*1000);
    await pg.query('UPDATE user_credits SET balance=12 WHERE user_id=$1',[buyer]);
    await fulfillInvoice(stripeFor(sub),db,inv);
    await fulfillInvoice(stripeFor(sub),db,{...inv,id:'in_fixture_old',lines:{data:[{subscription:sub.id,period:{end:end-86400*7}}]}});
    assert.equal((await row()).balance,12);
    await db.rpc('end_stripe_subscription',{_subscription_id:sub.id}); assert.equal((await row()).is_premium,false);
    await fulfillInvoice(stripeFor(sub),db,{...inv,id:'in_fixture_delayed_after_deletion'}); assert.equal((await row()).is_premium,false);
  } finally {await pg.close();}
});
test('gift subscription credits the recipient; gift credits and theme are atomic',async()=>{
  const {pg,db,row}=await database(); try {
    const sub=subscription('monthly','premium',true);
    const s={...checkout({is_gift:'true',gift_sender_id:buyer,gift_recipient_id:recipient},39999),mode:'subscription',subscription:sub.id};
    await pg.query('INSERT INTO subscription_gifts(gifter_id,recipient_id,stripe_session_id) VALUES($1,$2,$3)',[buyer,recipient,s.id]);
    await fulfillCheckout(stripeFor(sub),db,s,key,buyer,'subscription');
    assert.equal((await row(recipient)).balance,999999); assert.equal((await row()).balance,10);
    const credits=checkout({user_id:buyer,gift_pack:'small',gift_credits:'25'},499);
    await fulfillCheckout(stripeFor({}),db,credits,key);await fulfillCheckout(stripeFor({}),db,credits,key);
    assert.equal((await row()).gift_credits,25);
    const theme=checkout({user_id:buyer,theme:'darkcrow'},999);
    await fulfillCheckout(stripeFor({}),db,theme,key);await fulfillCheckout(stripeFor({}),db,theme,key);
    assert.deepEqual((await pg.query('SELECT owned_themes FROM profiles WHERE id=$1',[buyer])).rows[0].owned_themes,['darkcrow']);
  } finally {await pg.close();}
});
test('clients cannot invoke fulfillment RPCs or write their own receipts',async()=>{
  const {pg}=await database(); try {
    for(const role of ['anon','authenticated']) {
      await pg.exec(`SET ROLE ${role}`);
      await assert.rejects(()=>pg.query('SELECT fulfill_stripe_checkout($1)',[{}]),/permission denied/);
      await assert.rejects(()=>pg.query('SELECT renew_stripe_subscription($1)',[{}]),/permission denied/);
      await assert.rejects(()=>pg.exec('SELECT * FROM stripe_fulfillment_receipts'),/permission denied/);
      await pg.exec('RESET ROLE');
    }
  } finally {await pg.close();}
});
