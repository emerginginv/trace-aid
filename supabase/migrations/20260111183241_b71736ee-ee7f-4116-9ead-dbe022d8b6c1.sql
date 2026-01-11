-- Allow 'trialing' as a valid subscription status
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

ALTER TABLE public.organizations ADD CONSTRAINT organizations_subscription_status_check 
CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'trialing', 'inactive', 'past_due', 'canceled', 'pending_payment'));