-- Create billing_plans table with LemonSqueezy variant IDs
-- Based on your test output:
-- - Default variant: ID 992415 - $8999 (year)
-- - Variant1: ID 992413 - $8999 (year)

-- Create the plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS billing_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  interval VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, provider)
);

-- Insert the plans with LemonSqueezy variant IDs
INSERT INTO billing_plans (name, price_id, provider, amount_cents, currency, interval, is_active)
VALUES 
  ('pro', '992415', 'lemonsqueezy', 899900, 'USD', 'year', true),
  ('basic', '992413', 'lemonsqueezy', 899900, 'USD', 'year', true)
ON CONFLICT (name, provider) 
DO UPDATE SET 
  price_id = EXCLUDED.price_id,
  amount_cents = EXCLUDED.amount_cents,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  is_active = EXCLUDED.is_active;

-- Verify the plans
SELECT id, name, price_id, provider, amount_cents, currency, interval, is_active
FROM billing_plans 
WHERE provider = 'lemonsqueezy'
ORDER BY name;
