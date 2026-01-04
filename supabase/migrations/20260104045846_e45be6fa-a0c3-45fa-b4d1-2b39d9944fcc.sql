-- Drop overly-permissive "manage" policies
DROP POLICY IF EXISTS "Users can manage case activities in their organization" ON case_activities;
DROP POLICY IF EXISTS "Users can manage case attachments in their organization" ON case_attachments;
DROP POLICY IF EXISTS "Users can manage case subjects in their organization" ON case_subjects;
DROP POLICY IF EXISTS "Users can manage case updates in their organization" ON case_updates;
DROP POLICY IF EXISTS "Users can manage case finances in their organization" ON case_finances;

-- Drop existing "view" policies (will recreate with permission checks)
DROP POLICY IF EXISTS "Users can view case activities in their organization" ON case_activities;
DROP POLICY IF EXISTS "Users can view case attachments in their organization" ON case_attachments;
DROP POLICY IF EXISTS "Users can view case subjects in their organization" ON case_subjects;
DROP POLICY IF EXISTS "Users can view case updates in their organization" ON case_updates;
DROP POLICY IF EXISTS "Users can view case finances in their organization" ON case_finances;

-- ============================================
-- CASE ACTIVITIES - Permission-based policies
-- ============================================

CREATE POLICY "Users with view_activities permission can view"
ON case_activities FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_activities')
);

CREATE POLICY "Users with add_activities permission can insert"
ON case_activities FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_activities')
);

CREATE POLICY "Users with edit_activities permission can update"
ON case_activities FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_activities')
);

CREATE POLICY "Users with delete_activities permission can delete"
ON case_activities FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_activities')
);

-- ============================================
-- CASE ATTACHMENTS - Permission-based policies
-- ============================================

CREATE POLICY "Users with view_attachments permission can view"
ON case_attachments FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_attachments')
);

CREATE POLICY "Users with add_attachments permission can insert"
ON case_attachments FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_attachments')
);

CREATE POLICY "Users with edit_attachments permission can update"
ON case_attachments FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_attachments')
);

CREATE POLICY "Users with delete_attachments permission can delete"
ON case_attachments FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_attachments')
);

-- ============================================
-- CASE SUBJECTS - Permission-based policies
-- ============================================

CREATE POLICY "Users with view_subjects permission can view"
ON case_subjects FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_subjects')
);

CREATE POLICY "Users with add_subjects permission can insert"
ON case_subjects FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_subjects')
);

CREATE POLICY "Users with edit_subjects permission can update"
ON case_subjects FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_subjects')
);

CREATE POLICY "Users with delete_subjects permission can delete"
ON case_subjects FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_subjects')
);

-- ============================================
-- CASE UPDATES - Permission-based policies
-- ============================================

CREATE POLICY "Users with view_updates permission can view"
ON case_updates FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_updates')
);

CREATE POLICY "Users with add_updates permission can insert"
ON case_updates FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_updates')
);

CREATE POLICY "Users with edit_updates permission can update"
ON case_updates FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_updates')
);

CREATE POLICY "Users with delete_updates permission can delete"
ON case_updates FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_updates')
);

-- ============================================
-- CASE FINANCES - Permission-based policies
-- ============================================

CREATE POLICY "Users with view_finances permission can view"
ON case_finances FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_permission(auth.uid(), 'view_finances')
);

CREATE POLICY "Users with add_finances permission can insert"
ON case_finances FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'add_finances')
);

CREATE POLICY "Users with edit_finances permission can update"
ON case_finances FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'edit_finances')
);

CREATE POLICY "Users with delete_finances permission can delete"
ON case_finances FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id)
  AND has_permission(auth.uid(), 'delete_finances')
);