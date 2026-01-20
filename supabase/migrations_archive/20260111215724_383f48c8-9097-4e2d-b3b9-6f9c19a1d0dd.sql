-- PHASE 1: Add missing permissions data
-- Add add_contacts permission for all roles
INSERT INTO permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'add_contacts', true),
  ('manager', 'add_contacts', true),
  ('investigator', 'add_contacts', false),
  ('vendor', 'add_contacts', false)
ON CONFLICT DO NOTHING;

-- Add add_accounts permission for all roles (also missing from UI)
INSERT INTO permissions (role, feature_key, allowed)
VALUES 
  ('admin', 'add_accounts', true),
  ('manager', 'add_accounts', true),
  ('investigator', 'add_accounts', false),
  ('vendor', 'add_accounts', false)
ON CONFLICT DO NOTHING;

-- PHASE 2: Drop conflicting overly-permissive policies from cases table
DROP POLICY IF EXISTS "Users can manage cases in their organization" ON cases;

-- Drop duplicate/conflicting admin policies (we'll recreate with permission checks)
DROP POLICY IF EXISTS "Admins can delete cases in their organization" ON cases;
DROP POLICY IF EXISTS "Admins can insert cases in their organization" ON cases;
DROP POLICY IF EXISTS "Admins can update cases in their organization" ON cases;

-- Keep the view policy for now, but we'll make it permission-based
DROP POLICY IF EXISTS "Users can view cases in their organization" ON cases;

-- PHASE 3: Create permission-based RLS policies for cases
CREATE POLICY "Permission-based view cases"
ON cases FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_cases')
);

CREATE POLICY "Permission-based insert cases"
ON cases FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_cases')
);

CREATE POLICY "Permission-based update cases"
ON cases FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_cases')
);

CREATE POLICY "Permission-based delete cases"
ON cases FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_cases')
);

-- PHASE 4: Drop conflicting policies from accounts table
DROP POLICY IF EXISTS "Users can create accounts in their organization" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their organization" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts in their organization" ON accounts;
DROP POLICY IF EXISTS "Users can view accounts in their organization" ON accounts;
DROP POLICY IF EXISTS "Admins can delete accounts in their organization" ON accounts;
DROP POLICY IF EXISTS "Admins can insert accounts in their organization" ON accounts;
DROP POLICY IF EXISTS "Admins can update accounts in their organization" ON accounts;

-- Create permission-based RLS policies for accounts
CREATE POLICY "Permission-based view accounts"
ON accounts FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_accounts')
);

CREATE POLICY "Permission-based insert accounts"
ON accounts FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_accounts')
);

CREATE POLICY "Permission-based update accounts"
ON accounts FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_accounts')
);

CREATE POLICY "Permission-based delete accounts"
ON accounts FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_accounts')
);

-- PHASE 5: Drop conflicting policies from contacts table
DROP POLICY IF EXISTS "Users can create contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Admins can delete contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Admins can insert contacts in their organization" ON contacts;
DROP POLICY IF EXISTS "Admins can update contacts in their organization" ON contacts;

-- Create permission-based RLS policies for contacts
CREATE POLICY "Permission-based view contacts"
ON contacts FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_contacts')
);

CREATE POLICY "Permission-based insert contacts"
ON contacts FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_contacts')
);

CREATE POLICY "Permission-based update contacts"
ON contacts FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_contacts')
);

CREATE POLICY "Permission-based delete contacts"
ON contacts FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_contacts')
);