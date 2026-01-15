-- Fix: Invoice Financial Details Accessible to All Organization Members
-- Restrict invoice access to admins and managers only (financial management roles)

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view invoices in their organization" ON invoices;
DROP POLICY IF EXISTS "Users can manage invoices in their organization" ON invoices;
DROP POLICY IF EXISTS "Admins can insert invoices in their organization" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices in their organization" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices in their organization" ON invoices;

-- Create restrictive policies for financial management roles only
-- SELECT: Only admins and managers can view invoices
CREATE POLICY "Admins and managers can view invoices"
ON invoices FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'manager'::app_role)
  )
);

-- INSERT: Only admins and managers can create invoices
CREATE POLICY "Admins and managers can create invoices"
ON invoices FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'manager'::app_role)
  )
);

-- UPDATE: Only admins and managers can update invoices
CREATE POLICY "Admins and managers can update invoices"
ON invoices FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'manager'::app_role)
  )
);

-- DELETE: Only admins can delete invoices (more restrictive)
CREATE POLICY "Admins can delete invoices"
ON invoices FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);