-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Org members can view their integrations" ON public.organization_integrations;

-- Create a new policy that restricts viewing to admins and managers only
CREATE POLICY "Org admins and managers can view integrations"
ON public.organization_integrations
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_members.organization_id
    FROM organization_members
    WHERE organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'manager')
  )
);