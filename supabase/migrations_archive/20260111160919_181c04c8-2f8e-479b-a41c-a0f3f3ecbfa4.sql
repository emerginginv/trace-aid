-- Add plan_key column to organizations for simplified plan naming
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS plan_key text DEFAULT 'solo' 
CHECK (plan_key IN ('solo', 'team', 'enterprise'));

-- Add plan_features JSON for per-tenant feature flags
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS plan_features jsonb DEFAULT '{}'::jsonb;

-- Update subscription_status check constraint to include pending_payment
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_subscription_status_check 
CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'pending_payment'));

-- Create billing_events table (append-only audit)
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_org_id ON public.billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event ON public.billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON public.billing_events(created_at DESC);

-- Enable RLS on billing_events
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy for service role (append-only)
CREATE POLICY "Service role can insert billing events"
  ON public.billing_events FOR INSERT
  WITH CHECK (true);

-- Create SELECT policy for org admins to view their billing events
CREATE POLICY "Org admins can view billing events"
  ON public.billing_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- NO UPDATE or DELETE policies - this table is append-only

-- Create helper function to map Stripe product ID to plan key
CREATE OR REPLACE FUNCTION public.get_plan_key_from_product(product_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN product_id = 'prod_TagUwxglXyq7Ls' THEN 'solo'
    WHEN product_id = 'prod_TagbsPhNweUFpe' THEN 'team'
    WHEN product_id = 'prod_Tagc0lPxc1XjVC' THEN 'enterprise'
    ELSE 'solo'
  END;
$$;

-- Add comment explaining append-only nature
COMMENT ON TABLE public.billing_events IS 'Append-only audit log for Stripe billing events. No updates or deletes allowed.';