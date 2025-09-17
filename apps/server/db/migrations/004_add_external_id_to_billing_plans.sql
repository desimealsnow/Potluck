-- Add external_id column to billing_plans table for mapping provider variant IDs
ALTER TABLE billing_plans 
ADD COLUMN external_id VARCHAR(255);

-- Add index for efficient lookups
CREATE INDEX idx_billing_plans_external_id ON billing_plans(external_id);

-- Update existing plans with their LemonSqueezy variant IDs
UPDATE billing_plans 
SET external_id = '992413', provider = 'lemonsqueezy' 
WHERE name = 'pro';

UPDATE billing_plans 
SET external_id = '992415', provider = 'lemonsqueezy' 
WHERE name = 'basic';
