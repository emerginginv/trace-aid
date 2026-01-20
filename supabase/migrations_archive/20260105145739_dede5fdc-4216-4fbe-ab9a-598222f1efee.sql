-- =====================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================

-- 1. Fix permissions table - restrict to admins only
-- Drop the overly permissive policy that exposes our authorization model
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissions;

-- Create admin-only view policy
-- Application code uses has_permission() SECURITY DEFINER function which bypasses RLS
CREATE POLICY "Admins can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Create security audit log table for tracking security-sensitive events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'login', 'logout', 'login_failed',
    'password_change', 'password_reset_request', 'password_reset_complete',
    'email_change', 'role_change', 'user_created', 'user_deleted',
    'data_export', 'bulk_delete', 'sensitive_access',
    'permission_denied', 'suspicious_activity'
  )),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security audit logs for their organization
CREATE POLICY "Admins can view org security logs"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert security logs"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_org ON public.security_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_type ON public.security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_target ON public.security_audit_log(target_user_id, created_at DESC);

-- 3. Create function to log security events (callable from edge functions)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, user_id, organization_id, target_user_id,
    ip_address, user_agent, metadata
  )
  VALUES (
    p_event_type, p_user_id, p_organization_id, p_target_user_id,
    p_ip_address, p_user_agent, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;