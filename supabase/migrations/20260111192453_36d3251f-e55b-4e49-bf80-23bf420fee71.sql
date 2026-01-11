-- Drop all existing overloads of reporting functions to ensure clean slate
DROP FUNCTION IF EXISTS public.generate_report_content(uuid);
DROP FUNCTION IF EXISTS public.generate_audit_bundle(uuid);
DROP FUNCTION IF EXISTS public.generate_audit_bundle(uuid, timestamptz, timestamptz);

-- Recreate generate_report_content with CORRECT enum-cast role checks
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
  v_is_authorized boolean := false;
  v_date_from timestamptz;
  v_date_to timestamptz;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch the report
  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  -- Check authorization: user must be admin or manager in the organization
  -- CRITICAL: Use explicit enum casts to prevent invalid role literals
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_report.organization_id
      AND om.user_id = v_user_id
      AND om.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to generate this report';
  END IF;

  -- Update status to generating
  UPDATE public.reports SET status = 'generating' WHERE id = p_report_id;

  -- Parse date filters
  v_date_from := COALESCE((v_report.filters->>'date_from')::timestamptz, now() - interval '30 days');
  v_date_to := COALESCE((v_report.filters->>'date_to')::timestamptz, now());

  -- Generate report content based on type
  CASE v_report.report_type
    WHEN 'audit_log' THEN
      SELECT jsonb_build_object(
        'report_type', 'audit_log',
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
        'organization_id', v_report.organization_id,
        'data', COALESCE((
          SELECT jsonb_agg(row_to_json(ae.*))
          FROM public.audit_events ae
          WHERE ae.organization_id = v_report.organization_id
            AND ae.created_at BETWEEN v_date_from AND v_date_to
        ), '[]'::jsonb)
      ) INTO v_result;

    WHEN 'user_access' THEN
      SELECT jsonb_build_object(
        'report_type', 'user_access',
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
        'organization_id', v_report.organization_id,
        'data', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'user_id', om.user_id,
            'role', om.role,
            'joined_at', om.joined_at,
            'profile', (SELECT row_to_json(p.*) FROM public.profiles p WHERE p.id = om.user_id)
          ))
          FROM public.organization_members om
          WHERE om.organization_id = v_report.organization_id
        ), '[]'::jsonb)
      ) INTO v_result;

    WHEN 'data_processing' THEN
      SELECT jsonb_build_object(
        'report_type', 'data_processing',
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
        'organization_id', v_report.organization_id,
        'dsr_requests', COALESCE((
          SELECT jsonb_agg(row_to_json(dsr.*))
          FROM public.data_subject_requests dsr
          WHERE dsr.organization_id = v_report.organization_id
            AND dsr.created_at BETWEEN v_date_from AND v_date_to
        ), '[]'::jsonb),
        'cases_count', (
          SELECT count(*) FROM public.cases c
          WHERE c.organization_id = v_report.organization_id
            AND c.created_at BETWEEN v_date_from AND v_date_to
        )
      ) INTO v_result;

    WHEN 'security_incidents' THEN
      SELECT jsonb_build_object(
        'report_type', 'security_incidents',
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
        'organization_id', v_report.organization_id,
        'data', COALESCE((
          SELECT jsonb_agg(row_to_json(si.*))
          FROM public.security_incidents si
          WHERE si.organization_id = v_report.organization_id
            AND si.created_at BETWEEN v_date_from AND v_date_to
        ), '[]'::jsonb)
      ) INTO v_result;

    ELSE
      -- Generic fallback
      SELECT jsonb_build_object(
        'report_type', v_report.report_type,
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
        'organization_id', v_report.organization_id,
        'message', 'Report type not specifically handled, returning metadata only'
      ) INTO v_result;
  END CASE;

  -- Update report with content and mark as ready
  UPDATE public.reports
  SET status = 'ready',
      content = v_result,
      generated_at = now(),
      error_message = NULL
  WHERE id = p_report_id;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Mark report as failed with error message
  UPDATE public.reports
  SET status = 'failed',
      error_message = SQLERRM
  WHERE id = p_report_id;
  
  RAISE;
END;
$$;

-- Recreate generate_audit_bundle with CORRECT enum-cast role checks
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
  v_is_authorized boolean := false;
  v_result jsonb;
  v_org RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check authorization: user must be admin or manager in the organization
  -- CRITICAL: Use explicit enum casts to prevent invalid role literals
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to generate audit bundle for this organization';
  END IF;

  -- Get organization info
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Build comprehensive audit bundle
  SELECT jsonb_build_object(
    'bundle_type', 'full_audit',
    'generated_at', now(),
    'date_range', jsonb_build_object('from', p_date_from, 'to', p_date_to),
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'plan', COALESCE(v_org.plan_key, v_org.subscription_tier, 'unknown')
    ),
    
    -- Audit events
    'audit_events', COALESCE((
      SELECT jsonb_agg(row_to_json(ae.*))
      FROM public.audit_events ae
      WHERE ae.organization_id = p_organization_id
        AND ae.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Security incidents
    'security_incidents', COALESCE((
      SELECT jsonb_agg(row_to_json(si.*))
      FROM public.security_incidents si
      WHERE si.organization_id = p_organization_id
        AND si.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Access reviews
    'access_reviews', COALESCE((
      SELECT jsonb_agg(row_to_json(ar.*))
      FROM public.access_reviews ar
      WHERE ar.organization_id = p_organization_id
        AND ar.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Data subject requests
    'data_subject_requests', COALESCE((
      SELECT jsonb_agg(row_to_json(dsr.*))
      FROM public.data_subject_requests dsr
      WHERE dsr.organization_id = p_organization_id
        AND dsr.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- SOC2 controls
    'soc2_controls', COALESCE((
      SELECT jsonb_agg(row_to_json(sc.*))
      FROM public.soc2_controls sc
    ), '[]'::jsonb),
    
    -- Control evidence
    'control_evidence', COALESCE((
      SELECT jsonb_agg(row_to_json(ce.*))
      FROM public.control_evidence ce
      WHERE ce.collected_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Contracts
    'contracts', COALESCE((
      SELECT jsonb_agg(row_to_json(c.*))
      FROM public.contracts c
      WHERE c.organization_id = p_organization_id
        AND c.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Penetration tests
    'penetration_tests', COALESCE((
      SELECT jsonb_agg(row_to_json(pt.*))
      FROM public.penetration_tests pt
      WHERE pt.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Vulnerabilities
    'vulnerabilities', COALESCE((
      SELECT jsonb_agg(row_to_json(v.*))
      FROM public.vulnerabilities v
      WHERE v.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Compliance exports
    'compliance_exports', COALESCE((
      SELECT jsonb_agg(row_to_json(ce.*))
      FROM public.compliance_exports ce
      WHERE ce.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Billing events
    'billing_events', COALESCE((
      SELECT jsonb_agg(row_to_json(be.*))
      FROM public.billing_events be
      WHERE be.organization_id = p_organization_id
        AND be.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Backups
    'backups', COALESCE((
      SELECT jsonb_agg(row_to_json(b.*))
      FROM public.backups b
      WHERE b.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Disaster events
    'disaster_events', COALESCE((
      SELECT jsonb_agg(row_to_json(de.*))
      FROM public.disaster_events de
      WHERE de.created_at BETWEEN p_date_from AND p_date_to
    ), '[]'::jsonb),
    
    -- Organization members (current state)
    'organization_members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', om.user_id,
        'role', om.role,
        'joined_at', om.joined_at,
        'profile', (SELECT jsonb_build_object('full_name', p.full_name, 'email', p.email) FROM public.profiles p WHERE p.id = om.user_id)
      ))
      FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
    ), '[]'::jsonb)
    
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_report_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_audit_bundle(uuid, timestamptz, timestamptz) TO authenticated;