-- Add subscription and trial fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_product_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS current_users_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_used_gb numeric DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription 
ON organizations(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN organizations.trial_ends_at IS 'End date of trial period for the subscription';
COMMENT ON COLUMN organizations.subscription_product_id IS 'Stripe product ID for the current plan';
COMMENT ON COLUMN organizations.current_users_count IS 'Current number of users in the organization';
COMMENT ON COLUMN organizations.storage_used_gb IS 'Current storage usage in GB';