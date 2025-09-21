-- Update provider check constraints to include 'lemonsqueezy'
BEGIN;

-- payments.provider check
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_provider_ck'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_provider_ck;
  END IF;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_ck
  CHECK (provider = ANY (ARRAY['stripe','paypal','razorpay','square','lemonsqueezy']));

-- payment_methods.provider check
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_provider_ck'
  ) THEN
    ALTER TABLE public.payment_methods DROP CONSTRAINT payment_methods_provider_ck;
  END IF;
END $$;

ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_provider_ck
  CHECK (provider = ANY (ARRAY['stripe','paypal','razorpay','square','lemonsqueezy']));

COMMIT;

