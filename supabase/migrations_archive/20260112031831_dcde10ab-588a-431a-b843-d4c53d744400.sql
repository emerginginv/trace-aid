-- Fix billing_events INSERT policy
-- The "Service role can insert billing events" policy should only allow service role inserts
-- Not any authenticated user with WITH CHECK (true)

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert billing events" ON public.billing_events;

-- Create a proper policy that checks organization membership for authenticated users
-- Service role operations bypass RLS by default, so this policy is for regular users
-- Since billing events come from webhooks (service role), we should restrict regular users
CREATE POLICY "Org admins can insert billing events"
ON public.billing_events
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- The security_reports and status_subscribers tables are intentionally public:
-- - security_reports: External security researchers need to submit vulnerability reports
-- - status_subscribers: Anyone can subscribe to status updates
-- These are legitimate use cases for WITH CHECK (true) on INSERT

-- Add a comment explaining the intentional permissiveness
COMMENT ON POLICY "Anyone can submit security reports" ON public.security_reports IS 
  'Intentionally permissive: External security researchers need to submit vulnerability reports without authentication. This is a standard security.txt pattern.';

COMMENT ON POLICY "status_subscribers_public_insert" ON public.status_subscribers IS 
  'Intentionally permissive: Anyone can subscribe to status updates. Email verification is handled separately.';