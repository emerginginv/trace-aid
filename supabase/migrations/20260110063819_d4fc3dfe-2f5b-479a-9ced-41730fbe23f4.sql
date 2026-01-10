-- Step 9: Compliance, Retention & Data Subject Rights (Fixed roles)

-- 1. Add retention fields to organizations (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'default_retention_days') THEN
    ALTER TABLE organizations ADD COLUMN default_retention_days int NOT NULL DEFAULT 365;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'gdpr_enabled') THEN
    ALTER TABLE organizations ADD COLUMN gdpr_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Add retention fields to cases (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'retention_days') THEN
    ALTER TABLE cases ADD COLUMN retention_days int NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'retain_until') THEN
    ALTER TABLE cases ADD COLUMN retain_until timestamptz NULL;
  END IF;
END $$;

-- 3. Create data_subject_requests table
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_email text,
  subject_identifier text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('access', 'erasure', 'rectification')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processing', 'blocked_legal_hold', 'completed', 'denied')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  blocked_reason text,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  export_file_path text,
  export_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on data_subject_requests
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Org admins can view DSRs" ON data_subject_requests;
DROP POLICY IF EXISTS "Org admins can create DSRs" ON data_subject_requests;
DROP POLICY IF EXISTS "Org admins can update DSRs" ON data_subject_requests;

-- RLS policies for data_subject_requests (org admins only - using 'admin' role)
CREATE POLICY "Org admins can view DSRs" ON data_subject_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = data_subject_requests.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

CREATE POLICY "Org admins can create DSRs" ON data_subject_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = data_subject_requests.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update DSRs" ON data_subject_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = data_subject_requests.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_dsr_org_id ON data_subject_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_subject ON data_subject_requests(subject_identifier);
CREATE INDEX IF NOT EXISTS idx_cases_retain_until ON cases(retain_until) WHERE retain_until IS NOT NULL;

-- 5. Function to get effective retention days for a case
CREATE OR REPLACE FUNCTION public.get_case_retention_days(p_case_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_retention int;
  v_org_retention int;
BEGIN
  SELECT c.retention_days, o.default_retention_days
  INTO v_case_retention, v_org_retention
  FROM cases c
  JOIN organizations o ON o.id = c.organization_id
  WHERE c.id = p_case_id;
  
  RETURN COALESCE(v_case_retention, v_org_retention, 365);
END;
$$;

-- 6. Function to check if subject can be erased
CREATE OR REPLACE FUNCTION public.can_erase_subject(
  p_organization_id uuid,
  p_subject_identifier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_legal_hold boolean;
  v_open_cases int;
BEGIN
  SELECT legal_hold INTO v_org_legal_hold
  FROM organizations WHERE id = p_organization_id;
  
  IF v_org_legal_hold THEN
    RETURN jsonb_build_object(
      'can_erase', false,
      'reason', 'Organization is under legal hold',
      'code', 'ORG_LEGAL_HOLD'
    );
  END IF;
  
  SELECT COUNT(*) INTO v_open_cases
  FROM case_subjects cs
  JOIN cases c ON c.id = cs.case_id
  WHERE cs.organization_id = p_organization_id
    AND (cs.name ILIKE '%' || p_subject_identifier || '%' 
         OR (cs.details::text ILIKE '%' || p_subject_identifier || '%'))
    AND c.status NOT IN ('closed', 'archived');
    
  IF v_open_cases > 0 THEN
    RETURN jsonb_build_object(
      'can_erase', false,
      'reason', format('Subject appears in %s open case(s)', v_open_cases),
      'code', 'OPEN_CASES',
      'open_cases_count', v_open_cases
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_erase', true,
    'reason', 'Subject can be erased'
  );
END;
$$;

-- 7. Function to submit a data subject request
CREATE OR REPLACE FUNCTION public.submit_dsr(
  p_organization_id uuid,
  p_subject_identifier text,
  p_subject_email text,
  p_request_type text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dsr_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can submit DSRs');
  END IF;
  
  INSERT INTO data_subject_requests (
    organization_id,
    subject_identifier,
    subject_email,
    request_type,
    reason,
    requested_by
  ) VALUES (
    p_organization_id,
    p_subject_identifier,
    p_subject_email,
    p_request_type,
    p_reason,
    v_user_id
  )
  RETURNING id INTO v_dsr_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (
    p_organization_id,
    v_user_id,
    'DSR_SUBMITTED',
    jsonb_build_object(
      'dsr_id', v_dsr_id,
      'request_type', p_request_type,
      'subject_identifier', p_subject_identifier
    )
  );
  
  RETURN jsonb_build_object('success', true, 'dsr_id', v_dsr_id);
END;
$$;

-- 8. Function to process subject export (Right of Access)
CREATE OR REPLACE FUNCTION public.process_subject_export(p_dsr_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dsr record;
  v_subject_data jsonb;
  v_subjects jsonb;
  v_cases jsonb;
  v_updates jsonb;
BEGIN
  SELECT * INTO v_dsr FROM data_subject_requests WHERE id = p_dsr_id;
  
  IF v_dsr IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'DSR not found');
  END IF;
  
  IF v_dsr.request_type != 'access' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an access request');
  END IF;
  
  UPDATE data_subject_requests SET status = 'processing', updated_at = now() WHERE id = p_dsr_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_dsr.organization_id, v_user_id, 'DSR_EXPORT_REQUESTED',
    jsonb_build_object('dsr_id', p_dsr_id, 'subject_identifier', v_dsr.subject_identifier));
  
  SELECT jsonb_agg(jsonb_build_object(
    'id', cs.id, 'name', cs.name, 'subject_type', cs.subject_type,
    'case_id', cs.case_id, 'details', cs.details, 'notes', cs.notes, 'created_at', cs.created_at
  )) INTO v_subjects
  FROM case_subjects cs
  WHERE cs.organization_id = v_dsr.organization_id
    AND (cs.name ILIKE '%' || v_dsr.subject_identifier || '%'
         OR (cs.details::text ILIKE '%' || v_dsr.subject_identifier || '%'));
  
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'id', c.id, 'case_number', c.case_number, 'title', c.title,
    'status', c.status, 'created_at', c.created_at
  )) INTO v_cases
  FROM cases c
  JOIN case_subjects cs ON cs.case_id = c.id
  WHERE cs.organization_id = v_dsr.organization_id
    AND (cs.name ILIKE '%' || v_dsr.subject_identifier || '%'
         OR (cs.details::text ILIKE '%' || v_dsr.subject_identifier || '%'));
  
  SELECT jsonb_agg(jsonb_build_object(
    'id', cu.id, 'title', cu.title, 'update_type', cu.update_type, 'created_at', cu.created_at
  )) INTO v_updates
  FROM case_updates cu
  WHERE cu.organization_id = v_dsr.organization_id
    AND (cu.title ILIKE '%' || v_dsr.subject_identifier || '%'
         OR cu.description ILIKE '%' || v_dsr.subject_identifier || '%');
  
  v_subject_data := jsonb_build_object(
    'export_date', now(),
    'subject_identifier', v_dsr.subject_identifier,
    'subject_email', v_dsr.subject_email,
    'organization_id', v_dsr.organization_id,
    'subjects', COALESCE(v_subjects, '[]'::jsonb),
    'cases', COALESCE(v_cases, '[]'::jsonb),
    'updates', COALESCE(v_updates, '[]'::jsonb)
  );
  
  UPDATE data_subject_requests
  SET status = 'completed', completed_at = now(), completed_by = v_user_id,
      export_expires_at = now() + interval '7 days', updated_at = now()
  WHERE id = p_dsr_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_dsr.organization_id, v_user_id, 'DSR_EXPORT_COMPLETED',
    jsonb_build_object('dsr_id', p_dsr_id, 'subject_identifier', v_dsr.subject_identifier,
      'records_found', jsonb_array_length(COALESCE(v_subjects, '[]'::jsonb))));
  
  RETURN jsonb_build_object('success', true, 'data', v_subject_data);
END;
$$;

-- 9. Function to process subject erasure
CREATE OR REPLACE FUNCTION public.process_subject_erasure(p_dsr_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dsr record;
  v_can_erase jsonb;
  v_anonymized_count int := 0;
  v_anon_token text;
BEGIN
  SELECT * INTO v_dsr FROM data_subject_requests WHERE id = p_dsr_id;
  
  IF v_dsr IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'DSR not found');
  END IF;
  
  IF v_dsr.request_type != 'erasure' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an erasure request');
  END IF;
  
  v_can_erase := can_erase_subject(v_dsr.organization_id, v_dsr.subject_identifier);
  
  IF NOT (v_can_erase->>'can_erase')::boolean THEN
    UPDATE data_subject_requests
    SET status = 'blocked_legal_hold', blocked_reason = v_can_erase->>'reason', updated_at = now()
    WHERE id = p_dsr_id;
    
    INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
    VALUES (v_dsr.organization_id, v_user_id, 'DSR_ERASURE_BLOCKED',
      jsonb_build_object('dsr_id', p_dsr_id, 'subject_identifier', v_dsr.subject_identifier,
        'reason', v_can_erase->>'reason', 'code', v_can_erase->>'code'));
    
    RETURN jsonb_build_object('success', false, 'blocked', true, 'reason', v_can_erase->>'reason');
  END IF;
  
  UPDATE data_subject_requests SET status = 'processing', updated_at = now() WHERE id = p_dsr_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_dsr.organization_id, v_user_id, 'DSR_ERASURE_REQUESTED',
    jsonb_build_object('dsr_id', p_dsr_id, 'subject_identifier', v_dsr.subject_identifier));
  
  v_anon_token := '[REDACTED-' || substring(gen_random_uuid()::text, 1, 8) || ']';
  
  UPDATE case_subjects
  SET name = v_anon_token,
      notes = CASE WHEN notes IS NOT NULL THEN v_anon_token ELSE NULL END,
      details = CASE WHEN details IS NOT NULL THEN jsonb_build_object('anonymized', true, 'token', v_anon_token) ELSE NULL END,
      profile_image_url = NULL,
      updated_at = now()
  WHERE organization_id = v_dsr.organization_id
    AND (name ILIKE '%' || v_dsr.subject_identifier || '%'
         OR (details::text ILIKE '%' || v_dsr.subject_identifier || '%'));
  
  GET DIAGNOSTICS v_anonymized_count = ROW_COUNT;
  
  UPDATE data_subject_requests
  SET status = 'completed', completed_at = now(), completed_by = v_user_id, updated_at = now()
  WHERE id = p_dsr_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_dsr.organization_id, v_user_id, 'DSR_ERASURE_COMPLETED',
    jsonb_build_object('dsr_id', p_dsr_id, 'subject_identifier', v_dsr.subject_identifier,
      'records_anonymized', v_anonymized_count, 'anonymization_token', v_anon_token));
  
  RETURN jsonb_build_object('success', true, 'records_anonymized', v_anonymized_count, 'anonymization_token', v_anon_token);
END;
$$;

-- 10. Function to set case retention on close
CREATE OR REPLACE FUNCTION public.set_case_retention_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_days int;
BEGIN
  IF NEW.status IN ('closed', 'archived') AND (OLD.status IS NULL OR OLD.status NOT IN ('closed', 'archived')) THEN
    v_retention_days := get_case_retention_days(NEW.id);
    NEW.retain_until := COALESCE(NEW.closed_at, now()) + (v_retention_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_case_retention ON cases;
CREATE TRIGGER trigger_set_case_retention
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION set_case_retention_on_close();

-- 11. Function to get cases due for retention purge
CREATE OR REPLACE FUNCTION public.get_cases_due_for_retention_purge()
RETURNS TABLE (case_id uuid, case_number text, title text, organization_id uuid, retain_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.case_number, c.title, c.organization_id, c.retain_until
  FROM cases c
  JOIN organizations o ON o.id = c.organization_id
  WHERE c.retain_until IS NOT NULL
    AND c.retain_until < now()
    AND c.status IN ('closed', 'archived')
    AND o.legal_hold = false
    AND o.status = 'active';
END;
$$;

-- 12. Function to purge case by retention
CREATE OR REPLACE FUNCTION public.purge_case_by_retention(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case record;
  v_deleted_subjects int;
  v_deleted_updates int;
  v_deleted_attachments int;
  v_deleted_finances int;
  v_deleted_activities int;
BEGIN
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  
  IF v_case IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Case not found');
  END IF;
  
  IF v_case.retain_until IS NULL OR v_case.retain_until > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Retention period not expired');
  END IF;
  
  IF EXISTS (SELECT 1 FROM organizations o WHERE o.id = v_case.organization_id AND o.legal_hold = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization under legal hold');
  END IF;
  
  DELETE FROM case_subjects WHERE case_id = p_case_id;
  GET DIAGNOSTICS v_deleted_subjects = ROW_COUNT;
  
  DELETE FROM case_updates WHERE case_id = p_case_id;
  GET DIAGNOSTICS v_deleted_updates = ROW_COUNT;
  
  DELETE FROM case_attachments WHERE case_id = p_case_id;
  GET DIAGNOSTICS v_deleted_attachments = ROW_COUNT;
  
  DELETE FROM case_finances WHERE case_id = p_case_id;
  GET DIAGNOSTICS v_deleted_finances = ROW_COUNT;
  
  DELETE FROM case_activities WHERE case_id = p_case_id;
  GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
  
  DELETE FROM cases WHERE id = p_case_id;
  
  INSERT INTO audit_events (organization_id, action, metadata)
  VALUES (v_case.organization_id, 'CASE_PURGED_RETENTION',
    jsonb_build_object('case_id', p_case_id, 'case_number', v_case.case_number,
      'retain_until', v_case.retain_until, 'deleted_subjects', v_deleted_subjects,
      'deleted_updates', v_deleted_updates, 'deleted_attachments', v_deleted_attachments,
      'deleted_finances', v_deleted_finances, 'deleted_activities', v_deleted_activities));
  
  RETURN jsonb_build_object('success', true, 'case_number', v_case.case_number,
    'deleted_subjects', v_deleted_subjects, 'deleted_updates', v_deleted_updates,
    'deleted_attachments', v_deleted_attachments, 'deleted_finances', v_deleted_finances,
    'deleted_activities', v_deleted_activities);
END;
$$;

-- 13. Function to update org retention settings
CREATE OR REPLACE FUNCTION public.update_org_retention_settings(
  p_organization_id uuid,
  p_default_retention_days int,
  p_gdpr_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can update retention settings');
  END IF;
  
  UPDATE organizations
  SET default_retention_days = p_default_retention_days, gdpr_enabled = p_gdpr_enabled
  WHERE id = p_organization_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_organization_id, v_user_id, 'RETENTION_SETTINGS_UPDATED',
    jsonb_build_object('default_retention_days', p_default_retention_days, 'gdpr_enabled', p_gdpr_enabled));
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 14. Function to get compliance dashboard data
CREATE OR REPLACE FUNCTION public.get_compliance_dashboard(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org record;
  v_pending_dsrs int;
  v_completed_dsrs int;
  v_blocked_dsrs int;
  v_cases_due_purge int;
BEGIN
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('submitted', 'processing')),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'blocked_legal_hold')
  INTO v_pending_dsrs, v_completed_dsrs, v_blocked_dsrs
  FROM data_subject_requests
  WHERE organization_id = p_organization_id;
  
  SELECT COUNT(*) INTO v_cases_due_purge
  FROM cases c
  WHERE c.organization_id = p_organization_id
    AND c.retain_until IS NOT NULL
    AND c.retain_until < now()
    AND c.status IN ('closed', 'archived');
  
  RETURN jsonb_build_object(
    'retention_days', v_org.default_retention_days,
    'gdpr_enabled', v_org.gdpr_enabled,
    'legal_hold', v_org.legal_hold,
    'legal_hold_reason', v_org.legal_hold_reason,
    'pending_dsrs', v_pending_dsrs,
    'completed_dsrs', v_completed_dsrs,
    'blocked_dsrs', v_blocked_dsrs,
    'cases_due_purge', v_cases_due_purge
  );
END;
$$;