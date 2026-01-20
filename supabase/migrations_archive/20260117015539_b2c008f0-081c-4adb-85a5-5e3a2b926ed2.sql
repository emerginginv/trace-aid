-- Add RLS policy to allow organization members to insert subjects for internal case requests
CREATE POLICY "Org members can insert subjects for internal requests"
ON public.case_request_subjects
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM case_requests cr
    JOIN organization_members om ON om.organization_id = cr.organization_id
    WHERE cr.id = case_request_subjects.case_request_id
    AND om.user_id = auth.uid()
  )
);

-- Add RLS policy to allow organization members to insert files for internal case requests
CREATE POLICY "Org members can insert files for internal requests"
ON public.case_request_files
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM case_requests cr
    JOIN organization_members om ON om.organization_id = cr.organization_id
    WHERE cr.id = case_request_files.case_request_id
    AND om.user_id = auth.uid()
  )
);