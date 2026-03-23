-- Add RLS policies for organization_invites table
-- This allows admins to manage invites for their organization

-- Allow admins to view invites for their organization
CREATE POLICY "Admins can view organization invites" ON public.organization_invites
  FOR SELECT USING (
    is_org_member(auth.uid(), organization_id) AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to create invites for their organization
CREATE POLICY "Admins can create organization invites" ON public.organization_invites
  FOR INSERT WITH CHECK (
    is_org_member(auth.uid(), organization_id) AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to update invites for their organization (for revoking)
CREATE POLICY "Admins can update organization invites" ON public.organization_invites
  FOR UPDATE USING (
    is_org_member(auth.uid(), organization_id) AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to delete invites for their organization
CREATE POLICY "Admins can delete organization invites" ON public.organization_invites
  FOR DELETE USING (
    is_org_member(auth.uid(), organization_id) AND
    has_role(auth.uid(), 'admin'::app_role)
  );