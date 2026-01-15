-- Add retainer-specific permissions for role-based access control
-- Admins and Managers can view and manage retainers
-- Investigators and Vendors cannot access retainer data

-- Insert view_retainers permission
INSERT INTO public.permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_retainers', true),
  ('admin', 'manage_retainers', true),
  ('manager', 'view_retainers', true),
  ('manager', 'manage_retainers', true),
  ('investigator', 'view_retainers', false),
  ('investigator', 'manage_retainers', false),
  ('vendor', 'view_retainers', false),
  ('vendor', 'manage_retainers', false)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Update RLS policies on retainer_funds to enforce role-based access
-- Drop existing permissive organization-level policies
DROP POLICY IF EXISTS "Users can manage retainer funds in their organization" ON public.retainer_funds;
DROP POLICY IF EXISTS "Users can view retainer funds in their organization" ON public.retainer_funds;

-- Create new role-based policies that restrict access to admin/manager only
CREATE POLICY "Billing roles can view retainer funds"
  ON public.retainer_funds FOR SELECT
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Billing roles can insert retainer funds"
  ON public.retainer_funds FOR INSERT
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Billing roles can update retainer funds"
  ON public.retainer_funds FOR UPDATE
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );

CREATE POLICY "Billing roles can delete retainer funds"
  ON public.retainer_funds FOR DELETE
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );