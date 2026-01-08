-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own email change requests" ON public.email_change_requests;

-- Create a new SELECT policy that only allows users to see their own requests
-- but we'll also revoke direct table access and use a view instead
CREATE POLICY "Users can view own email change requests" 
ON public.email_change_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a secure view that excludes the token column
CREATE OR REPLACE VIEW public.email_change_requests_safe AS
SELECT 
  id,
  user_id,
  old_email,
  new_email,
  expires_at,
  created_at,
  completed_at
FROM public.email_change_requests;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.email_change_requests_safe TO authenticated;

-- Revoke direct SELECT on the base table from the anon and authenticated roles
-- This forces clients to use the safe view
REVOKE SELECT ON public.email_change_requests FROM anon;
REVOKE SELECT ON public.email_change_requests FROM authenticated;

-- Re-grant INSERT permission (users need to create requests)
GRANT INSERT ON public.email_change_requests TO authenticated;