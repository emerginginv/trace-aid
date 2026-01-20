-- Fix RLS policies for vendors and investigators to submit updates and manage expenses

-- ============================================
-- CASE UPDATES POLICIES
-- ============================================

-- Drop the restrictive vendor insert policy
DROP POLICY IF EXISTS "Vendors can insert own updates" ON case_updates;

-- Create new policy allowing vendors/investigators to insert updates for cases they're assigned to
CREATE POLICY "Vendors and investigators can insert updates for assigned cases"
ON case_updates
FOR INSERT
TO public
WITH CHECK (
  (has_role(auth.uid(), 'vendor'::app_role) OR has_role(auth.uid(), 'investigator'::app_role))
  AND user_id = auth.uid()
  AND is_org_member(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = case_updates.case_id 
    AND cases.investigator_ids @> ARRAY[auth.uid()]
  )
);

-- Update SELECT policy for vendors to see updates for assigned cases
DROP POLICY IF EXISTS "Vendors can view own updates" ON case_updates;

CREATE POLICY "Vendors and investigators can view updates for assigned cases"
ON case_updates
FOR SELECT
TO public
USING (
  (has_role(auth.uid(), 'vendor'::app_role) OR has_role(auth.uid(), 'investigator'::app_role))
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_updates.case_id 
      AND cases.investigator_ids @> ARRAY[auth.uid()]
    )
  )
);

-- ============================================
-- CASE FINANCES POLICIES FOR EXPENSES
-- ============================================

-- Drop the blocking policy for vendors
DROP POLICY IF EXISTS "Vendors cannot access finances" ON case_finances;

-- Allow vendors and investigators to INSERT their own expenses
CREATE POLICY "Vendors and investigators can insert own expenses"
ON case_finances
FOR INSERT
TO public
WITH CHECK (
  (has_role(auth.uid(), 'vendor'::app_role) OR has_role(auth.uid(), 'investigator'::app_role))
  AND user_id = auth.uid()
  AND finance_type = 'expense'
  AND is_org_member(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = case_finances.case_id 
    AND cases.investigator_ids @> ARRAY[auth.uid()]
  )
);

-- Allow vendors and investigators to SELECT their own expenses
CREATE POLICY "Vendors and investigators can view own expenses"
ON case_finances
FOR SELECT
TO public
USING (
  (has_role(auth.uid(), 'vendor'::app_role) OR has_role(auth.uid(), 'investigator'::app_role))
  AND user_id = auth.uid()
  AND finance_type = 'expense'
);

-- Allow vendors and investigators to UPDATE their own expenses (if not approved/rejected)
CREATE POLICY "Vendors and investigators can update own expenses"
ON case_finances
FOR UPDATE
TO public
USING (
  (has_role(auth.uid(), 'vendor'::app_role) OR has_role(auth.uid(), 'investigator'::app_role))
  AND user_id = auth.uid()
  AND finance_type = 'expense'
  AND (status IS NULL OR status NOT IN ('approved', 'rejected'))
)
WITH CHECK (
  user_id = auth.uid()
  AND finance_type = 'expense'
);