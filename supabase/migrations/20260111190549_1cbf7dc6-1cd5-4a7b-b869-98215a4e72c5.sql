-- Drop existing functions first to handle parameter name change
DROP FUNCTION IF EXISTS public.generate_report_content(uuid);
DROP FUNCTION IF EXISTS public.generate_audit_bundle(uuid);

-- Recreate generate_report_content function with correct column names
CREATE OR REPLACE FUNCTION public.generate_report_content(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
  v_content jsonb;
  v_org_id uuid;
BEGIN
  -- Get the report
  SELECT * INTO v_report FROM organization_reports WHERE id = p_report_id;
  
  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
  
  v_org_id := v_report.organization_id;
  
  -- Generate content based on report type
  CASE v_report.report_type
    WHEN 'security' THEN
      v_content := jsonb_build_object(
        'report_type', 'security',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', COALESCE(o.plan_key, o.subscription_tier),
            'subscription_tier', o.subscription_tier
          )
          FROM organizations o WHERE o.id = v_org_id
        ),
        'date_range', jsonb_build_object(
          'start', v_report.filters->>'start_date',
          'end', v_report.filters->>'end_date'
        ),
        'access_reviews', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ar.id,
            'review_type', ar.review_type,
            'status', ar.status,
            'created_at', ar.created_at,
            'completed_at', ar.completed_at
          )), '[]'::jsonb)
          FROM access_reviews ar
          WHERE ar.organization_id = v_org_id
          AND (v_report.filters->>'start_date' IS NULL OR ar.created_at >= (v_report.filters->>'start_date')::timestamptz)
          AND (v_report.filters->>'end_date' IS NULL OR ar.created_at <= (v_report.filters->>'end_date')::timestamptz)
        ),
        'security_incidents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', si.id,
            'title', si.title,
            'severity', si.severity,
            'status', si.status,
            'detected_at', si.detected_at,
            'resolved_at', si.resolved_at
          )), '[]'::jsonb)
          FROM security_incidents si
          WHERE si.organization_id = v_org_id
          AND (v_report.filters->>'start_date' IS NULL OR si.detected_at >= (v_report.filters->>'start_date')::timestamptz)
          AND (v_report.filters->>'end_date' IS NULL OR si.detected_at <= (v_report.filters->>'end_date')::timestamptz)
        ),
        'sso_status', jsonb_build_object(
          'enabled', false,
          'provider', null,
          'note', 'SSO configuration managed externally'
        )
      );
      
    WHEN 'audit_logs' THEN
      v_content := jsonb_build_object(
        'report_type', 'audit_logs',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', COALESCE(o.plan_key, o.subscription_tier)
          )
          FROM organizations o WHERE o.id = v_org_id
        ),
        'date_range', jsonb_build_object(
          'start', v_report.filters->>'start_date',
          'end', v_report.filters->>'end_date'
        ),
        'audit_events', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', sub.id,
            'action', sub.action,
            'actor_user_id', sub.actor_user_id,
            'metadata', sub.metadata,
            'created_at', sub.created_at
          )), '[]'::jsonb)
          FROM (
            SELECT ae.id, ae.action, ae.actor_user_id, ae.metadata, ae.created_at
            FROM audit_events ae
            WHERE ae.organization_id = v_org_id
            AND (v_report.filters->>'start_date' IS NULL OR ae.created_at >= (v_report.filters->>'start_date')::timestamptz)
            AND (v_report.filters->>'end_date' IS NULL OR ae.created_at <= (v_report.filters->>'end_date')::timestamptz)
            ORDER BY ae.created_at DESC
          ) sub
        ),
        'total_events', (
          SELECT COUNT(*)
          FROM audit_events ae
          WHERE ae.organization_id = v_org_id
          AND (v_report.filters->>'start_date' IS NULL OR ae.created_at >= (v_report.filters->>'start_date')::timestamptz)
          AND (v_report.filters->>'end_date' IS NULL OR ae.created_at <= (v_report.filters->>'end_date')::timestamptz)
        )
      );
      
    WHEN 'compliance' THEN
      v_content := jsonb_build_object(
        'report_type', 'compliance',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', COALESCE(o.plan_key, o.subscription_tier)
          )
          FROM organizations o WHERE o.id = v_org_id
        ),
        'soc2_controls', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', sc.id,
            'control_id', sc.control_id,
            'name', sc.name,
            'category', sc.category,
            'status', sc.status,
            'last_reviewed_at', sc.last_reviewed_at
          )), '[]'::jsonb)
          FROM soc2_controls sc
        ),
        'contracts', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'contract_type', c.contract_type,
            'status', c.status,
            'effective_date', c.effective_date,
            'expiration_date', c.expiration_date
          )), '[]'::jsonb)
          FROM contracts c
          WHERE c.organization_id = v_org_id
        ),
        'data_subject_requests', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', dsr.id,
            'request_type', dsr.request_type,
            'status', dsr.status,
            'created_at', dsr.created_at,
            'completed_at', dsr.completed_at
          )), '[]'::jsonb)
          FROM data_subject_requests dsr
          WHERE dsr.organization_id = v_org_id
          AND (v_report.filters->>'start_date' IS NULL OR dsr.created_at >= (v_report.filters->>'start_date')::timestamptz)
          AND (v_report.filters->>'end_date' IS NULL OR dsr.created_at <= (v_report.filters->>'end_date')::timestamptz)
        )
      );
      
    WHEN 'vulnerabilities' THEN
      v_content := jsonb_build_object(
        'report_type', 'vulnerabilities',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', COALESCE(o.plan_key, o.subscription_tier)
          )
          FROM organizations o WHERE o.id = v_org_id
        ),
        'security_incidents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', si.id,
            'title', si.title,
            'description', si.description,
            'severity', si.severity,
            'status', si.status,
            'detected_at', si.detected_at,
            'resolved_at', si.resolved_at,
            'root_cause', si.root_cause,
            'remediation_steps', si.remediation_steps
          )), '[]'::jsonb)
          FROM security_incidents si
          WHERE si.organization_id = v_org_id
          AND (v_report.filters->>'start_date' IS NULL OR si.detected_at >= (v_report.filters->>'start_date')::timestamptz)
          AND (v_report.filters->>'end_date' IS NULL OR si.detected_at <= (v_report.filters->>'end_date')::timestamptz)
        ),
        'pen_tests', '[]'::jsonb,
        'pen_tests_note', 'Penetration test tracking available in enterprise security dashboard'
      );
      
    WHEN 'billing' THEN
      v_content := jsonb_build_object(
        'report_type', 'billing',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', COALESCE(o.plan_key, o.subscription_tier),
            'subscription_tier', o.subscription_tier,
            'current_users', o.current_users_count,
            'max_users', o.max_users,
            'storage_used_gb', o.storage_used_gb,
            'max_cases', o.max_cases
          )
          FROM organizations o WHERE o.id = v_org_id
        ),
        'date_range', jsonb_build_object(
          'start', v_report.filters->>'start_date',
          'end', v_report.filters->>'end_date'
        ),
        'billing_events', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', sub.id,
            'event_type', sub.event_type,
            'stripe_event_id', sub.stripe_event_id,
            'created_at', sub.created_at,
            'processed_at', sub.processed_at
          )), '[]'::jsonb)
          FROM (
            SELECT be.id, be.event_type, be.stripe_event_id, be.created_at, be.processed_at
            FROM billing_events be
            WHERE be.organization_id = v_org_id
            AND (v_report.filters->>'start_date' IS NULL OR be.created_at >= (v_report.filters->>'start_date')::timestamptz)
            AND (v_report.filters->>'end_date' IS NULL OR be.created_at <= (v_report.filters->>'end_date')::timestamptz)
            ORDER BY be.created_at DESC
          ) sub
        )
      );
      
    ELSE
      v_content := jsonb_build_object(
        'report_type', v_report.report_type,
        'error', 'Unknown report type'
      );
  END CASE;
  
  -- Update report status
  UPDATE organization_reports
  SET status = 'completed', completed_at = now(), content = v_content
  WHERE id = p_report_id;
  
  RETURN v_content;
END;
$$;

-- Recreate generate_audit_bundle function with correct column names
CREATE OR REPLACE FUNCTION public.generate_audit_bundle(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle jsonb;
BEGIN
  v_bundle := jsonb_build_object(
    'generated_at', now(),
    'bundle_type', 'full_audit',
    'organization', (
      SELECT jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'plan', COALESCE(o.plan_key, o.subscription_tier),
        'subscription_tier', o.subscription_tier,
        'created_at', o.created_at,
        'current_users', o.current_users_count,
        'max_users', o.max_users,
        'storage_used_gb', o.storage_used_gb
      )
      FROM organizations o WHERE o.id = p_org_id
    ),
    'users', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'role', p.role,
        'created_at', p.created_at,
        'last_login', p.last_login
      )), '[]'::jsonb)
      FROM profiles p
      WHERE p.organization_id = p_org_id
    ),
    'access_reviews', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'review_type', sub.review_type,
        'status', sub.status,
        'reviewer_id', sub.reviewer_id,
        'created_at', sub.created_at,
        'completed_at', sub.completed_at,
        'notes', sub.notes
      )), '[]'::jsonb)
      FROM (
        SELECT ar.id, ar.review_type, ar.status, ar.reviewer_id, ar.created_at, ar.completed_at, ar.notes
        FROM access_reviews ar
        WHERE ar.organization_id = p_org_id
        ORDER BY ar.created_at DESC
      ) sub
    ),
    'audit_events', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'action', sub.action,
        'actor_user_id', sub.actor_user_id,
        'metadata', sub.metadata,
        'created_at', sub.created_at
      )), '[]'::jsonb)
      FROM (
        SELECT ae.id, ae.action, ae.actor_user_id, ae.metadata, ae.created_at
        FROM audit_events ae
        WHERE ae.organization_id = p_org_id
        ORDER BY ae.created_at DESC
        LIMIT 1000
      ) sub
    ),
    'security_incidents', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'title', sub.title,
        'severity', sub.severity,
        'status', sub.status,
        'detected_at', sub.detected_at,
        'resolved_at', sub.resolved_at,
        'description', sub.description
      )), '[]'::jsonb)
      FROM (
        SELECT si.id, si.title, si.severity, si.status, si.detected_at, si.resolved_at, si.description
        FROM security_incidents si
        WHERE si.organization_id = p_org_id
        ORDER BY si.detected_at DESC
      ) sub
    ),
    'contracts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'contract_type', c.contract_type,
        'status', c.status,
        'effective_date', c.effective_date,
        'expiration_date', c.expiration_date,
        'auto_renews', c.auto_renews
      )), '[]'::jsonb)
      FROM contracts c
      WHERE c.organization_id = p_org_id
    ),
    'data_subject_requests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'request_type', sub.request_type,
        'status', sub.status,
        'subject_identifier', sub.subject_identifier,
        'created_at', sub.created_at,
        'completed_at', sub.completed_at
      )), '[]'::jsonb)
      FROM (
        SELECT dsr.id, dsr.request_type, dsr.status, dsr.subject_identifier, dsr.created_at, dsr.completed_at
        FROM data_subject_requests dsr
        WHERE dsr.organization_id = p_org_id
        ORDER BY dsr.created_at DESC
      ) sub
    ),
    'soc2_controls', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sc.id,
        'control_id', sc.control_id,
        'name', sc.name,
        'category', sc.category,
        'status', sc.status,
        'owner', sc.owner,
        'last_reviewed_at', sc.last_reviewed_at
      )), '[]'::jsonb)
      FROM soc2_controls sc
    ),
    'backups', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'backup_type', sub.backup_type,
        'status', sub.status,
        'started_at', sub.started_at,
        'completed_at', sub.completed_at,
        'size_bytes', sub.size_bytes
      )), '[]'::jsonb)
      FROM (
        SELECT b.id, b.backup_type, b.status, b.started_at, b.completed_at, b.size_bytes
        FROM backups b
        ORDER BY b.started_at DESC
        LIMIT 100
      ) sub
    ),
    'disaster_events', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'severity', sub.severity,
        'description', sub.description,
        'declared_at', sub.declared_at,
        'recovery_started_at', sub.recovery_started_at,
        'recovery_completed_at', sub.recovery_completed_at
      )), '[]'::jsonb)
      FROM (
        SELECT de.id, de.severity, de.description, de.declared_at, de.recovery_started_at, de.recovery_completed_at
        FROM disaster_events de
        ORDER BY de.declared_at DESC
      ) sub
    )
  );
  
  RETURN v_bundle;
END;
$$;