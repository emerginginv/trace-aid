-- Add RLS policy to allow anonymous users to view case types that are allowed on public forms
CREATE POLICY "Public forms can view allowed case types"
ON case_types
FOR SELECT
USING (
  is_active = true
  AND allow_on_public_form = true
  AND EXISTS (
    SELECT 1 FROM case_request_forms crf
    WHERE crf.organization_id = case_types.organization_id
    AND crf.is_active = true
    AND crf.is_public = true
  )
);