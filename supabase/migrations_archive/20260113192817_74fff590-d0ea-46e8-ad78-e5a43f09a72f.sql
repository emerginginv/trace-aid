-- Add missing columns for billing items per SYSTEM PROMPT 8
ALTER TABLE case_finances 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS case_service_instance_id uuid REFERENCES case_service_instances(id),
ADD COLUMN IF NOT EXISTS billing_type text CHECK (billing_type IN ('time', 'expense')),
ADD COLUMN IF NOT EXISTS pricing_model text CHECK (pricing_model IN ('hourly', 'daily', 'per_activity', 'flat'));

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_case_finances_account_id ON case_finances(account_id);
CREATE INDEX IF NOT EXISTS idx_case_finances_service_instance ON case_finances(case_service_instance_id);
CREATE INDEX IF NOT EXISTS idx_case_finances_billing_type ON case_finances(billing_type);
CREATE INDEX IF NOT EXISTS idx_case_finances_pricing_model ON case_finances(pricing_model);