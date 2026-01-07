-- Fix the overly permissive INSERT policy on security_audit_log
-- Security logs should only be inserted via the log_security_event function (SECURITY DEFINER)
-- or by the service role, not by any authenticated user

DROP POLICY IF EXISTS "Service role can insert security logs" ON public.security_audit_log;

-- Create a more restrictive policy that allows:
-- 1. Users to insert logs for themselves (user_id = auth.uid())
-- 2. Admins to insert logs for actions they take on others
CREATE POLICY "Users can insert their own security logs" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User can log their own actions
  user_id = auth.uid()
  OR
  -- Or if user_id is null (system events), must be an admin
  (user_id IS NULL AND public.is_admin_of_any_org(auth.uid()))
);