-- Add RLS policy to allow organization members to create internal case requests
CREATE POLICY "Org members can create internal case requests"
ON public.case_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = case_requests.organization_id
    AND organization_members.user_id = auth.uid()
  )
);