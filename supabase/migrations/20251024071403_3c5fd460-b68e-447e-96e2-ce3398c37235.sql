-- Create function to check if a case is accessible by vendor
CREATE OR REPLACE FUNCTION public.is_vendor_case_accessible(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vendors can access cases they created or cases with their updates
  RETURN EXISTS (
    SELECT 1 FROM cases WHERE id = _case_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM case_updates WHERE case_id = _case_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM case_activities WHERE case_id = _case_id AND assigned_user_id = _user_id
  );
END;
$$;

-- Update RLS policies for vendors on cases
DROP POLICY IF EXISTS "Vendors can view assigned cases" ON cases;
CREATE POLICY "Vendors can view assigned cases"
ON cases
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  is_vendor_case_accessible(auth.uid(), id)
);

-- Update RLS policies for vendors on case_updates
DROP POLICY IF EXISTS "Vendors can view own updates" ON case_updates;
CREATE POLICY "Vendors can view own updates"
ON case_updates
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Vendors can insert own updates" ON case_updates;
CREATE POLICY "Vendors can insert own updates"
ON case_updates
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  user_id = auth.uid()
);

-- Update RLS policies for vendors on case_attachments (read-only for their cases)
DROP POLICY IF EXISTS "Vendors can view attachments on accessible cases" ON case_attachments;
CREATE POLICY "Vendors can view attachments on accessible cases"
ON case_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  is_vendor_case_accessible(auth.uid(), case_id)
);

DROP POLICY IF EXISTS "Vendors can upload attachments" ON case_attachments;
CREATE POLICY "Vendors can upload attachments"
ON case_attachments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  user_id = auth.uid() AND
  is_vendor_case_accessible(auth.uid(), case_id)
);

-- Vendors should NOT see activities assigned to others
DROP POLICY IF EXISTS "Vendors can view own activities" ON case_activities;
CREATE POLICY "Vendors can view own activities"
ON case_activities
FOR SELECT
USING (
  has_role(auth.uid(), 'vendor'::app_role) AND 
  (assigned_user_id = auth.uid() OR user_id = auth.uid())
);

-- Prevent vendors from accessing accounts (overriding the general SELECT policy)
DROP POLICY IF EXISTS "Vendors cannot access accounts" ON accounts;
CREATE POLICY "Vendors cannot access accounts"
ON accounts
FOR SELECT
USING (NOT has_role(auth.uid(), 'vendor'::app_role));

-- Prevent vendors from accessing contacts
DROP POLICY IF EXISTS "Vendors cannot access contacts" ON contacts;
CREATE POLICY "Vendors cannot access contacts"
ON contacts
FOR SELECT
USING (NOT has_role(auth.uid(), 'vendor'::app_role));

-- Prevent vendors from accessing finances
DROP POLICY IF EXISTS "Vendors cannot access finances" ON case_finances;
CREATE POLICY "Vendors cannot access finances"
ON case_finances
FOR SELECT
USING (NOT has_role(auth.uid(), 'vendor'::app_role));