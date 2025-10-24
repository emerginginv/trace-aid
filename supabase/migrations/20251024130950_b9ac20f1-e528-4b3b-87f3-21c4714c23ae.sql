-- Add trigger to cases table to auto-create organization
CREATE TRIGGER ensure_case_organization
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

-- Fix existing cases: create organizations for users and set organization_id
DO $$
DECLARE
  case_record RECORD;
  user_org_id uuid;
  user_email text;
BEGIN
  -- Loop through all cases with NULL organization_id
  FOR case_record IN 
    SELECT DISTINCT user_id 
    FROM cases 
    WHERE organization_id IS NULL
  LOOP
    -- Check if user already has an organization
    SELECT organization_id INTO user_org_id
    FROM organization_members
    WHERE user_id = case_record.user_id
    LIMIT 1;

    -- If no organization exists, create one
    IF user_org_id IS NULL THEN
      -- Get user email
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = case_record.user_id;

      -- Create organization
      INSERT INTO organizations (name, billing_email)
      VALUES ('My Organization', user_email)
      RETURNING id INTO user_org_id;

      -- Add user as admin member
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (user_org_id, case_record.user_id, 'admin');

      -- Add admin role if not exists
      INSERT INTO user_roles (user_id, role)
      VALUES (case_record.user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Update all cases for this user to have the organization_id
    UPDATE cases
    SET organization_id = user_org_id
    WHERE user_id = case_record.user_id
      AND organization_id IS NULL;
  END LOOP;
END $$;