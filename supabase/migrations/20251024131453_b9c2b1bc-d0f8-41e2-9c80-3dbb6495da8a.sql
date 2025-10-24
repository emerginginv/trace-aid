-- Add trigger to case_subjects table to auto-set organization
CREATE TRIGGER ensure_subject_organization
  BEFORE INSERT ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

-- Fix existing subjects: set organization_id for subjects with NULL
UPDATE case_subjects cs
SET organization_id = om.organization_id
FROM organization_members om
WHERE cs.user_id = om.user_id
  AND cs.organization_id IS NULL;