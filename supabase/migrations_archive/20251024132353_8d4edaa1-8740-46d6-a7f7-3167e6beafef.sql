-- Add trigger to organization_settings table
CREATE TRIGGER ensure_org_settings_organization
  BEFORE INSERT ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

-- Fix existing records by setting organization_id from organization_members
UPDATE organization_settings os
SET organization_id = om.organization_id
FROM organization_members om
WHERE os.user_id = om.user_id
  AND os.organization_id IS NULL;