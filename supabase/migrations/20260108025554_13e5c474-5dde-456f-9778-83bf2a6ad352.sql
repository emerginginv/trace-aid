-- Drop the existing view and recreate with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.email_change_requests_safe;

-- Create the view with SECURITY INVOKER (uses the permissions of the querying user)
CREATE VIEW public.email_change_requests_safe 
WITH (security_invoker = true) AS
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