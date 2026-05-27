BEGIN;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'purchases'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%product_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.purchases
ADD CONSTRAINT purchases_product_type_check
CHECK (
  product_type IN (
    'credits',
    'credits_50',
    'credits_75',
    'credits_100',
    'credits_130',
    'credits_220',
    'premium',
    'premium_monthly',
    'standard_monthly',
    'premium_weekly',
    'gift_premium_monthly',
    'like_reveal'
  )
);

COMMIT;

SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.purchases'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%product_type%';
