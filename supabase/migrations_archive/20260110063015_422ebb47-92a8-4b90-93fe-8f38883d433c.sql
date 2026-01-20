-- ============================================
-- Step 8: Tenant Offboarding & Data Retention
-- ============================================

-- 1. Add offboarding fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
ADD COLUMN IF NOT EXISTS retention_days int NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS legal_hold boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_hold_reason text,
ADD COLUMN IF NOT EXISTS legal_hold_set_at timestamptz,
ADD COLUMN IF NOT EXISTS legal_hold_set_by uuid REFERENCES auth.users(id);

-- Add check constraint for status values
ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_status_check 
CHECK (status IN ('active', 'suspended', 'pending_deletion', 'deleted'));

-- 2. Create organization_exports table
CREATE TABLE IF NOT EXISTS public.organization_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed', 'expired')),
  export_type text NOT NULL DEFAULT 'full' CHECK (export_type IN ('full', 'cases_only', 'attachments_only')),
  file_path text,
  file_size_bytes bigint,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS on organization_exports
ALTER TABLE public.organization_exports ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_exports
CREATE POLICY "Org admins can request exports"
  ON public.organization_exports
  FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Org admins can view their exports"
  ON public.organization_exports
  FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Create organization_deletions table
CREATE TABLE IF NOT EXISTS public.organization_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'scheduled', 'purging', 'purged', 'canceled', 'blocked_legal_hold')),
  scheduled_for timestamptz,
  canceled_at timestamptz,
  canceled_by uuid REFERENCES auth.users(id),
  purged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on organization_deletions
ALTER TABLE public.organization_deletions ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_deletions
CREATE POLICY "Org admins can request deletion"
  ON public.organization_deletions
  FOR INSERT
  WITH CHECK (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Org admins can view deletion status"
  ON public.organization_deletions
  FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Org admins can cancel pending deletion"
  ON public.organization_deletions
  FOR UPDATE
  USING (
    is_org_member(auth.uid(), organization_id) 
    AND has_role(auth.uid(), 'admin'::app_role)
    AND status IN ('requested', 'scheduled')
  );

-- 4. Create helper function to check if org is active
CREATE OR REPLACE FUNCTION public.is_org_active(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = p_organization_id 
    AND status = 'active'
  );
END;
$$;

-- 5. Request org export function
CREATE OR REPLACE FUNCTION public.request_org_export(
  p_organization_id uuid,
  p_export_type text DEFAULT 'full'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_status text;
  v_export_id uuid;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check user is admin of this org
  IF NOT (is_org_member(v_user_id, p_organization_id) AND has_role(v_user_id, 'admin')) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can request exports');
  END IF;

  -- Check org status (allow export for active or pending_deletion)
  SELECT status INTO v_org_status FROM organizations WHERE id = p_organization_id;
  IF v_org_status NOT IN ('active', 'pending_deletion') THEN
    RETURN json_build_object('success', false, 'error', 'Organization is not accessible');
  END IF;

  -- Check for existing pending/processing export
  IF EXISTS (
    SELECT 1 FROM organization_exports 
    WHERE organization_id = p_organization_id 
    AND status IN ('queued', 'processing')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'An export is already in progress');
  END IF;

  -- Create export request
  INSERT INTO organization_exports (organization_id, requested_by, export_type, expires_at)
  VALUES (p_organization_id, v_user_id, p_export_type, now() + interval '7 days')
  RETURNING id INTO v_export_id;

  -- Log audit event
  INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
  VALUES (
    p_organization_id,
    'EXPORT_REQUESTED',
    v_user_id,
    json_build_object('export_id', v_export_id, 'export_type', p_export_type)
  );

  RETURN json_build_object(
    'success', true, 
    'export_id', v_export_id,
    'message', 'Export queued. You will be notified when ready.'
  );
END;
$$;

-- 6. Request org deletion function
CREATE OR REPLACE FUNCTION public.request_org_deletion(
  p_organization_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org record;
  v_deletion_id uuid;
  v_scheduled_for timestamptz;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check user is admin of this org
  IF NOT (is_org_member(v_user_id, p_organization_id) AND has_role(v_user_id, 'admin')) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can request deletion');
  END IF;

  -- Get org details
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  IF v_org IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Check legal hold
  IF v_org.legal_hold THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete organization under legal hold');
  END IF;

  -- Check if already pending deletion
  IF v_org.status = 'pending_deletion' THEN
    RETURN json_build_object('success', false, 'error', 'Organization is already pending deletion');
  END IF;

  -- Check if already deleted
  IF v_org.status = 'deleted' THEN
    RETURN json_build_object('success', false, 'error', 'Organization is already deleted');
  END IF;

  -- Calculate scheduled purge date
  v_scheduled_for := now() + (v_org.retention_days || ' days')::interval;

  -- Update organization status
  UPDATE organizations
  SET 
    status = 'pending_deletion',
    deleted_at = now(),
    deletion_scheduled_for = v_scheduled_for,
    updated_at = now()
  WHERE id = p_organization_id;

  -- Create deletion record
  INSERT INTO organization_deletions (organization_id, requested_by, reason, status, scheduled_for)
  VALUES (p_organization_id, v_user_id, p_reason, 'scheduled', v_scheduled_for)
  RETURNING id INTO v_deletion_id;

  -- Disable custom domains
  UPDATE organization_domains
  SET is_active = false, updated_at = now()
  WHERE organization_id = p_organization_id;

  -- Log audit event
  INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
  VALUES (
    p_organization_id,
    'ORG_DELETION_REQUESTED',
    v_user_id,
    json_build_object(
      'deletion_id', v_deletion_id,
      'reason', p_reason,
      'scheduled_for', v_scheduled_for
    )
  );

  RETURN json_build_object(
    'success', true,
    'deletion_id', v_deletion_id,
    'scheduled_for', v_scheduled_for,
    'message', format('Organization scheduled for permanent deletion on %s', v_scheduled_for::date)
  );
END;
$$;

-- 7. Cancel org deletion function
CREATE OR REPLACE FUNCTION public.cancel_org_deletion(p_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deletion record;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check user is admin of this org
  IF NOT (is_org_member(v_user_id, p_organization_id) AND has_role(v_user_id, 'admin')) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can cancel deletion');
  END IF;

  -- Get deletion record
  SELECT * INTO v_deletion 
  FROM organization_deletions 
  WHERE organization_id = p_organization_id 
  AND status IN ('requested', 'scheduled');
  
  IF v_deletion IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No pending deletion found');
  END IF;

  -- Update organization status back to active
  UPDATE organizations
  SET 
    status = 'active',
    deleted_at = NULL,
    deletion_scheduled_for = NULL,
    updated_at = now()
  WHERE id = p_organization_id;

  -- Update deletion record
  UPDATE organization_deletions
  SET 
    status = 'canceled',
    canceled_at = now(),
    canceled_by = v_user_id,
    updated_at = now()
  WHERE id = v_deletion.id;

  -- Log audit event
  INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
  VALUES (
    p_organization_id,
    'ORG_DELETION_CANCELED',
    v_user_id,
    json_build_object('deletion_id', v_deletion.id)
  );

  RETURN json_build_object('success', true, 'message', 'Deletion canceled. Organization restored.');
END;
$$;

-- 8. Set legal hold function
CREATE OR REPLACE FUNCTION public.set_org_legal_hold(
  p_organization_id uuid,
  p_enable boolean,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check user is admin of this org
  IF NOT (is_org_member(v_user_id, p_organization_id) AND has_role(v_user_id, 'admin')) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can set legal hold');
  END IF;

  -- Require reason when enabling
  IF p_enable AND (p_reason IS NULL OR trim(p_reason) = '') THEN
    RETURN json_build_object('success', false, 'error', 'Reason is required when enabling legal hold');
  END IF;

  -- Update organization
  IF p_enable THEN
    UPDATE organizations
    SET 
      legal_hold = true,
      legal_hold_reason = p_reason,
      legal_hold_set_at = now(),
      legal_hold_set_by = v_user_id,
      updated_at = now()
    WHERE id = p_organization_id;

    -- If there's a pending deletion, block it
    UPDATE organization_deletions
    SET status = 'blocked_legal_hold', updated_at = now()
    WHERE organization_id = p_organization_id 
    AND status IN ('requested', 'scheduled');

    -- Log audit event
    INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
    VALUES (p_organization_id, 'LEGAL_HOLD_ENABLED', v_user_id, json_build_object('reason', p_reason));
  ELSE
    UPDATE organizations
    SET 
      legal_hold = false,
      legal_hold_reason = NULL,
      legal_hold_set_at = NULL,
      legal_hold_set_by = NULL,
      updated_at = now()
    WHERE id = p_organization_id;

    -- Log audit event
    INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
    VALUES (p_organization_id, 'LEGAL_HOLD_DISABLED', v_user_id, json_build_object());
  END IF;

  RETURN json_build_object('success', true, 'message', CASE WHEN p_enable THEN 'Legal hold enabled' ELSE 'Legal hold disabled' END);
END;
$$;

-- 9. Get org offboarding status function
CREATE OR REPLACE FUNCTION public.get_org_offboarding_status(p_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org record;
  v_deletion record;
  v_exports json;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check user is admin of this org
  IF NOT (is_org_member(v_user_id, p_organization_id) AND has_role(v_user_id, 'admin')) THEN
    RETURN json_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get organization
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  IF v_org IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Get latest deletion request
  SELECT * INTO v_deletion 
  FROM organization_deletions 
  WHERE organization_id = p_organization_id 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Get exports
  SELECT json_agg(row_to_json(e.*) ORDER BY e.created_at DESC) INTO v_exports
  FROM organization_exports e
  WHERE e.organization_id = p_organization_id;

  RETURN json_build_object(
    'success', true,
    'organization', json_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'status', v_org.status,
      'deleted_at', v_org.deleted_at,
      'deletion_scheduled_for', v_org.deletion_scheduled_for,
      'retention_days', v_org.retention_days,
      'legal_hold', v_org.legal_hold,
      'legal_hold_reason', v_org.legal_hold_reason,
      'legal_hold_set_at', v_org.legal_hold_set_at
    ),
    'deletion', CASE WHEN v_deletion IS NOT NULL THEN json_build_object(
      'id', v_deletion.id,
      'status', v_deletion.status,
      'reason', v_deletion.reason,
      'scheduled_for', v_deletion.scheduled_for,
      'created_at', v_deletion.created_at
    ) ELSE NULL END,
    'exports', COALESCE(v_exports, '[]'::json)
  );
END;
$$;

-- 10. Purge organization function (service role only, called by scheduled job)
CREATE OR REPLACE FUNCTION public.purge_organization(p_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org record;
  v_deletion record;
BEGIN
  -- This function should be called with service role

  -- Get organization
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  IF v_org IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Check status
  IF v_org.status != 'pending_deletion' THEN
    RETURN json_build_object('success', false, 'error', 'Organization is not pending deletion');
  END IF;

  -- Check legal hold
  IF v_org.legal_hold THEN
    RETURN json_build_object('success', false, 'error', 'Organization is under legal hold');
  END IF;

  -- Check if scheduled date has passed
  IF v_org.deletion_scheduled_for > now() THEN
    RETURN json_build_object('success', false, 'error', 'Scheduled deletion date has not passed yet');
  END IF;

  -- Get deletion record
  SELECT * INTO v_deletion 
  FROM organization_deletions 
  WHERE organization_id = p_organization_id 
  AND status = 'scheduled';
  
  IF v_deletion IS NOT NULL THEN
    UPDATE organization_deletions
    SET status = 'purging', updated_at = now()
    WHERE id = v_deletion.id;
  END IF;

  -- Delete all tenant data (cascades handle most)
  -- Order matters to respect foreign keys
  
  -- Delete case-related data
  DELETE FROM case_finances WHERE organization_id = p_organization_id;
  DELETE FROM case_subjects WHERE organization_id = p_organization_id;
  DELETE FROM case_updates WHERE organization_id = p_organization_id;
  DELETE FROM case_activities WHERE organization_id = p_organization_id;
  DELETE FROM case_attachments WHERE organization_id = p_organization_id;
  DELETE FROM case_budget_adjustments WHERE organization_id = p_organization_id;
  DELETE FROM attachment_folders WHERE organization_id = p_organization_id;
  DELETE FROM attachment_access WHERE organization_id = p_organization_id;
  DELETE FROM attachment_preview_logs WHERE organization_id = p_organization_id;
  
  -- Delete invoices and payments
  DELETE FROM invoice_payments WHERE organization_id = p_organization_id;
  DELETE FROM invoices WHERE organization_id = p_organization_id;
  
  -- Delete cases
  DELETE FROM cases WHERE organization_id = p_organization_id;
  
  -- Delete contacts and accounts
  DELETE FROM contacts WHERE organization_id = p_organization_id;
  DELETE FROM accounts WHERE organization_id = p_organization_id;
  
  -- Delete documents
  DELETE FROM document_instances WHERE organization_id = p_organization_id;
  DELETE FROM document_templates WHERE organization_id = p_organization_id;
  DELETE FROM docx_templates WHERE organization_id = p_organization_id;
  DELETE FROM document_exports WHERE organization_id = p_organization_id;
  DELETE FROM generated_reports WHERE organization_id = p_organization_id;
  
  -- Delete notifications
  DELETE FROM notifications WHERE organization_id = p_organization_id;
  
  -- Delete organization-level data
  DELETE FROM organization_settings WHERE organization_id = p_organization_id;
  DELETE FROM organization_domains WHERE organization_id = p_organization_id;
  DELETE FROM organization_invites WHERE organization_id = p_organization_id;
  DELETE FROM organization_members WHERE organization_id = p_organization_id;
  DELETE FROM organization_usage WHERE organization_id = p_organization_id;
  DELETE FROM organization_entitlements_overrides WHERE organization_id = p_organization_id;
  DELETE FROM organization_exports WHERE organization_id = p_organization_id;
  
  -- Delete import data
  DELETE FROM import_type_mappings WHERE organization_id = p_organization_id;
  DELETE FROM import_batches WHERE organization_id = p_organization_id;
  
  -- Delete picklists
  DELETE FROM picklists WHERE organization_id = p_organization_id;
  
  -- Delete audit events last
  DELETE FROM audit_events WHERE organization_id = p_organization_id;

  -- Mark organization as deleted (keep minimal record for compliance)
  UPDATE organizations
  SET 
    status = 'deleted',
    updated_at = now(),
    -- Clear sensitive data
    stripe_customer_id = NULL,
    stripe_subscription_id = NULL,
    billing_email = NULL
  WHERE id = p_organization_id;

  -- Update deletion record
  IF v_deletion IS NOT NULL THEN
    UPDATE organization_deletions
    SET status = 'purged', purged_at = now(), updated_at = now()
    WHERE id = v_deletion.id;
  END IF;

  -- Log final audit event (this won't be deleted since we already deleted audit_events)
  INSERT INTO audit_events (organization_id, action, metadata)
  VALUES (p_organization_id, 'ORG_PURGED', json_build_object('purged_at', now()));

  RETURN json_build_object('success', true, 'message', 'Organization purged successfully');
END;
$$;

-- 11. Check organizations due for purge (for scheduled job)
CREATE OR REPLACE FUNCTION public.get_organizations_due_for_purge()
RETURNS TABLE (organization_id uuid, organization_name text, scheduled_for timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, deletion_scheduled_for
  FROM organizations
  WHERE status = 'pending_deletion'
  AND legal_hold = false
  AND deletion_scheduled_for <= now();
$$;