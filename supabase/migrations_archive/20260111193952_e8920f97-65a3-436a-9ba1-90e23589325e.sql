-- =====================================================
-- FIX: Reports & Exports - Enum alignment + missing columns + org isolation
-- =====================================================

-- 1) Add missing content column to reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS content jsonb;

-- 2) Drop all overloads of generate_report_content
DROP FUNCTION IF EXISTS public.generate_report_content(uuid);

-- 3) Recreate generate_report_content with correct enum handling and schema
CREATE OR REPLACE FUNCTION public.generate_report_content(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
  v_result jsonb;
  v_user_id uuid;
  v_org_member_ids uuid[];
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get report details
  SELECT r.*, o.name as org_name, o.plan_key, o.subscription_tier
  INTO v_report
  FROM public.reports r
  JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.id = p_report_id;

  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  -- Authorization: user must be admin or manager in the org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_report.organization_id
      AND om.user_id = v_user_id
      AND om.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to generate reports';
  END IF;

  -- Check enterprise plan
  IF COALESCE(v_report.plan_key, v_report.subscription_tier, '') NOT IN ('enterprise', 'Enterprise') THEN
    RAISE EXCEPTION 'Enterprise plan required for report generation';
  END IF;

  -- Update status to generating
  UPDATE public.reports 
  SET status = 'generating', error_message = NULL 
  WHERE id = p_report_id;

  -- Build org member IDs for membership-based scoping
  SELECT ARRAY_AGG(om.user_id) INTO v_org_member_ids
  FROM public.organization_members om
  WHERE om.organization_id = v_report.organization_id;

  -- Generate content based on report type (use ::text to avoid enum casting issues)
  CASE v_report.report_type::text
    WHEN 'security' THEN
      SELECT jsonb_build_object(
        'report_type', 'security',
        'organization', v_report.org_name,
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_report.date_from, 'to', v_report.date_to),
        'security_incidents', COALESCE((
          SELECT jsonb_agg(row_to_json(si.*))
          FROM public.security_incidents si
          WHERE si.reported_by = ANY(v_org_member_ids)
            AND si.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND si.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb),
        'vulnerabilities', COALESCE((
          SELECT jsonb_agg(row_to_json(v.*))
          FROM public.vulnerabilities v
          WHERE v.created_by = ANY(v_org_member_ids)
            AND v.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND v.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb),
        'penetration_tests', COALESCE((
          SELECT jsonb_agg(row_to_json(pt.*))
          FROM public.penetration_tests pt
          WHERE pt.created_by = ANY(v_org_member_ids)
            AND pt.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND pt.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb)
      ) INTO v_result;

    WHEN 'audit_logs' THEN
      SELECT jsonb_build_object(
        'report_type', 'audit_logs',
        'organization', v_report.org_name,
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_report.date_from, 'to', v_report.date_to),
        'audit_events', COALESCE((
          SELECT jsonb_agg(row_to_json(ae.*))
          FROM public.audit_events ae
          WHERE ae.organization_id = v_report.organization_id
            AND ae.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND ae.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb),
        'access_reviews', COALESCE((
          SELECT jsonb_agg(row_to_json(ar.*))
          FROM public.access_reviews ar
          WHERE ar.organization_id = v_report.organization_id
            AND ar.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND ar.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb)
      ) INTO v_result;

    WHEN 'compliance' THEN
      SELECT jsonb_build_object(
        'report_type', 'compliance',
        'organization', v_report.org_name,
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_report.date_from, 'to', v_report.date_to),
        'soc2_controls', COALESCE((
          SELECT jsonb_agg(row_to_json(sc.*))
          FROM public.soc2_controls sc
        ), '[]'::jsonb),
        'control_evidence', COALESCE((
          SELECT jsonb_agg(row_to_json(ce.*))
          FROM public.control_evidence ce
          WHERE ce.collected_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND ce.collected_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb),
        'contracts', COALESCE((
          SELECT jsonb_agg(row_to_json(c.*))
          FROM public.contracts c
          WHERE c.organization_id = v_report.organization_id
            AND c.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND c.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb),
        'data_subject_requests', COALESCE((
          SELECT jsonb_agg(row_to_json(dsr.*))
          FROM public.data_subject_requests dsr
          WHERE dsr.organization_id = v_report.organization_id
            AND dsr.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND dsr.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb)
      ) INTO v_result;

    WHEN 'vulnerabilities' THEN
      SELECT jsonb_build_object(
        'report_type', 'vulnerabilities',
        'organization', v_report.org_name,
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_report.date_from, 'to', v_report.date_to),
        'vulnerabilities', COALESCE((
          SELECT jsonb_agg(row_to_json(v.*))
          FROM public.vulnerabilities v
          WHERE v.created_by = ANY(v_org_member_ids)
            AND v.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND v.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb),
        'penetration_tests', COALESCE((
          SELECT jsonb_agg(row_to_json(pt.*))
          FROM public.penetration_tests pt
          WHERE pt.created_by = ANY(v_org_member_ids)
            AND pt.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND pt.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb)
      ) INTO v_result;

    WHEN 'billing' THEN
      SELECT jsonb_build_object(
        'report_type', 'billing',
        'organization', v_report.org_name,
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_report.date_from, 'to', v_report.date_to),
        'billing_events', COALESCE((
          SELECT jsonb_agg(row_to_json(be.*))
          FROM public.billing_events be
          WHERE be.organization_id = v_report.organization_id
            AND be.created_at >= COALESCE(v_report.date_from, '1970-01-01'::timestamptz)
            AND be.created_at <= COALESCE(v_report.date_to, now())
        ), '[]'::jsonb)
      ) INTO v_result;

    ELSE
      -- Fallback for any unexpected type
      v_result := jsonb_build_object(
        'report_type', v_report.report_type::text,
        'organization', v_report.org_name,
        'generated_at', now(),
        'message', 'Report type not specifically handled'
      );
  END CASE;

  -- Update report as ready with content
  UPDATE public.reports 
  SET status = 'ready', 
      generated_at = now(), 
      content = v_result,
      error_message = NULL
  WHERE id = p_report_id;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Mark as failed with error message
  UPDATE public.reports 
  SET status = 'failed', 
      error_message = SQLERRM
  WHERE id = p_report_id;
  RAISE;
END;
$$;

-- 4) Drop all overloads of generate_audit_bundle
DROP FUNCTION IF EXISTS public.generate_audit_bundle(uuid, timestamptz, timestamptz);

-- 5) Recreate generate_audit_bundle without referencing non-existent columns
CREATE OR REPLACE FUNCTION public.generate_audit_bundle(
  p_organization_id uuid,
  p_date_from timestamptz,
  p_date_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org RECORD;
  v_result jsonb;
  v_org_member_ids uuid[];
  v_incident_ids uuid[];
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get organization details
  SELECT * INTO v_org
  FROM public.organizations
  WHERE id = p_organization_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Authorization: user must be admin or manager in the org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to generate audit bundle';
  END IF;

  -- Check enterprise plan
  IF COALESCE(v_org.plan_key, v_org.subscription_tier, '') NOT IN ('enterprise', 'Enterprise') THEN
    RAISE EXCEPTION 'Enterprise plan required for audit bundle generation';
  END IF;

  -- Build org member IDs for membership-based scoping
  SELECT ARRAY_AGG(om.user_id) INTO v_org_member_ids
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id;

  -- Get incident IDs scoped to org members (for disaster_events linkage)
  SELECT ARRAY_AGG(si.id) INTO v_incident_ids
  FROM public.security_incidents si
  WHERE si.reported_by = ANY(v_org_member_ids)
    AND si.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
    AND si.created_at <= COALESCE(p_date_to, now());

  -- Build the comprehensive audit bundle
  SELECT jsonb_build_object(
    'bundle_type', 'full_audit',
    'organization', v_org.name,
    'generated_at', now(),
    'date_range', jsonb_build_object('from', p_date_from, 'to', p_date_to),
    
    -- Org-scoped tables (have organization_id)
    'audit_events', COALESCE((
      SELECT jsonb_agg(row_to_json(ae.*))
      FROM public.audit_events ae
      WHERE ae.organization_id = p_organization_id
        AND ae.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND ae.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'billing_events', COALESCE((
      SELECT jsonb_agg(row_to_json(be.*))
      FROM public.billing_events be
      WHERE be.organization_id = p_organization_id
        AND be.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND be.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'data_subject_requests', COALESCE((
      SELECT jsonb_agg(row_to_json(dsr.*))
      FROM public.data_subject_requests dsr
      WHERE dsr.organization_id = p_organization_id
        AND dsr.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND dsr.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'contracts', COALESCE((
      SELECT jsonb_agg(row_to_json(c.*))
      FROM public.contracts c
      WHERE c.organization_id = p_organization_id
        AND c.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND c.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'access_reviews', COALESCE((
      SELECT jsonb_agg(row_to_json(ar.*))
      FROM public.access_reviews ar
      WHERE ar.organization_id = p_organization_id
        AND ar.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND ar.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    -- Membership-scoped tables (no organization_id, use member IDs)
    'security_incidents', COALESCE((
      SELECT jsonb_agg(row_to_json(si.*))
      FROM public.security_incidents si
      WHERE si.reported_by = ANY(v_org_member_ids)
        AND si.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND si.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'penetration_tests', COALESCE((
      SELECT jsonb_agg(row_to_json(pt.*))
      FROM public.penetration_tests pt
      WHERE pt.created_by = ANY(v_org_member_ids)
        AND pt.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND pt.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'vulnerabilities', COALESCE((
      SELECT jsonb_agg(row_to_json(v.*))
      FROM public.vulnerabilities v
      WHERE v.created_by = ANY(v_org_member_ids)
        AND v.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND v.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    -- Global tables scoped by membership
    'compliance_exports', COALESCE((
      SELECT jsonb_agg(row_to_json(ce.*))
      FROM public.compliance_exports ce
      WHERE ce.requested_by = ANY(v_org_member_ids)
        AND ce.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND ce.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    'backups', COALESCE((
      SELECT jsonb_agg(row_to_json(b.*))
      FROM public.backups b
      WHERE b.created_by::uuid = ANY(v_org_member_ids)
        AND b.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND b.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    -- Disaster events linked through incidents
    'disaster_events', COALESCE((
      SELECT jsonb_agg(row_to_json(de.*))
      FROM public.disaster_events de
      WHERE (de.incident_id = ANY(v_incident_ids) OR de.declared_by = ANY(v_org_member_ids))
        AND de.created_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND de.created_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb),
    
    -- SOC2 controls (global, no date filtering needed)
    'soc2_controls', COALESCE((
      SELECT jsonb_agg(row_to_json(sc.*))
      FROM public.soc2_controls sc
    ), '[]'::jsonb),
    
    'control_evidence', COALESCE((
      SELECT jsonb_agg(row_to_json(ce.*))
      FROM public.control_evidence ce
      WHERE ce.collected_at >= COALESCE(p_date_from, '1970-01-01'::timestamptz)
        AND ce.collected_at <= COALESCE(p_date_to, now())
    ), '[]'::jsonb)
    
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_report_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_audit_bundle(uuid, timestamptz, timestamptz) TO authenticated;