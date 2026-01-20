-- Fix picklists RLS policies to work with organization membership
-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Admins can insert all picklists" ON picklists;
DROP POLICY IF EXISTS "Admins can update all picklists" ON picklists;
DROP POLICY IF EXISTS "Admins can delete all picklists" ON picklists;

-- Create new policies that work with organization membership
CREATE POLICY "Organization members can insert picklists"
ON picklists
FOR INSERT
WITH CHECK (
  -- User must be in the organization
  is_org_member(auth.uid(), organization_id) OR
  -- Or if organization_id is NULL, allow insert (for migration/setup)
  organization_id IS NULL
);

CREATE POLICY "Organization admins can update picklists"
ON picklists
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Organization admins can delete picklists"
ON picklists
FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure users who aren't in an organization yet can still use the system
-- by auto-assigning them when they try to create data
CREATE OR REPLACE FUNCTION public.ensure_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
BEGIN
  -- Check if user has an organization
  SELECT organization_id INTO user_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- If no organization, create one
  IF user_org_id IS NULL THEN
    -- Get user email
    DECLARE
      user_email text;
    BEGIN
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = auth.uid();

      -- Create organization
      INSERT INTO organizations (name, billing_email)
      VALUES ('My Organization', user_email)
      RETURNING id INTO user_org_id;

      -- Add user as admin member
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (user_org_id, auth.uid(), 'admin');

      -- Add admin role
      INSERT INTO user_roles (user_id, role)
      VALUES (auth.uid(), 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END;
  END IF;

  -- Set the organization_id if it's NULL
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := user_org_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to picklists to ensure organization
DROP TRIGGER IF EXISTS ensure_picklist_organization ON picklists;
CREATE TRIGGER ensure_picklist_organization
  BEFORE INSERT ON picklists
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();