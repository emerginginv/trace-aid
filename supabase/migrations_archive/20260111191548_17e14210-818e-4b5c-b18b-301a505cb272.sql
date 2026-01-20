-- Drop ALL existing overloads of the reporting functions
DROP FUNCTION IF EXISTS public.generate_report_content(uuid);
DROP FUNCTION IF EXISTS public.generate_audit_bundle(uuid);
DROP FUNCTION IF EXISTS public.generate_audit_bundle(uuid, timestamptz, timestamptz);

-- Recreate generate_report_content with correct schema references
CREATE OR REPLACE FUNCTION public.generate_report_content(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
  v_content jsonb;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Fetch the report from public.reports table
  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
  
  -- Verify user has access (must be admin of the organization)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_report.organization_id
      AND om.user_id = v_user_id
      AND om.role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Access denied: You must be an organization admin to generate reports';
  END IF;
  
  -- Update status to generating
  UPDATE public.reports SET status = 'generating' WHERE id = p_report_id;
  
  -- Parse date filters
  v_date_from := COALESCE((v_report.filters->>'date_from')::timestamptz, now() - interval '30 days');
  v_date_to := COALESCE((v_report.filters->>'date_to')::timestamptz, now());
  
  BEGIN
    -- Build content based on report type
    CASE v_report.report_type
      WHEN 'security' THEN
        v_content := jsonb_build_object(
          'report_type', 'security',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'organization', (
            SELECT jsonb_build_object(
              'id', o.id,
              'name', o.name,
              'plan', COALESCE(o.plan_key, o.subscription_tier, 'unknown')
            )
            FROM public.organizations o WHERE o.id = v_report.organization_id
          ),
          'security_incidents', (
            SELECT COALESCE(jsonb_agg(row_to_json(si.*)), '[]'::jsonb)
            FROM public.security_incidents si
            WHERE si.organization_id = v_report.organization_id
              AND si.created_at BETWEEN v_date_from AND v_date_to
          ),
          'access_reviews', (
            SELECT COALESCE(jsonb_agg(row_to_json(ar.*)), '[]'::jsonb)
            FROM public.access_reviews ar
            WHERE ar.organization_id = v_report.organization_id
              AND ar.created_at BETWEEN v_date_from AND v_date_to
          ),
          'data_subject_requests', (
            SELECT COALESCE(jsonb_agg(row_to_json(dsr.*)), '[]'::jsonb)
            FROM public.data_subject_requests dsr
            WHERE dsr.organization_id = v_report.organization_id
              AND dsr.created_at BETWEEN v_date_from AND v_date_to
          )
        );
        
      WHEN 'audit_logs' THEN
        v_content := jsonb_build_object(
          'report_type', 'audit_logs',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'organization', (
            SELECT jsonb_build_object(
              'id', o.id,
              'name', o.name,
              'plan', COALESCE(o.plan_key, o.subscription_tier, 'unknown')
            )
            FROM public.organizations o WHERE o.id = v_report.organization_id
          ),
          'audit_events', (
            SELECT COALESCE(jsonb_agg(row_to_json(ae.*)), '[]'::jsonb)
            FROM public.audit_events ae
            WHERE ae.organization_id = v_report.organization_id
              AND ae.created_at BETWEEN v_date_from AND v_date_to
          )
        );
        
      WHEN 'compliance' THEN
        v_content := jsonb_build_object(
          'report_type', 'compliance',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'organization', (
            SELECT jsonb_build_object(
              'id', o.id,
              'name', o.name,
              'plan', COALESCE(o.plan_key, o.subscription_tier, 'unknown')
            )
            FROM public.organizations o WHERE o.id = v_report.organization_id
          ),
          'soc2_controls', (
            SELECT COALESCE(jsonb_agg(row_to_json(sc.*)), '[]'::jsonb)
            FROM public.soc2_controls sc
          ),
          'control_evidence', (
            SELECT COALESCE(jsonb_agg(row_to_json(ce.*)), '[]'::jsonb)
            FROM public.control_evidence ce
            WHERE ce.collected_at BETWEEN v_date_from AND v_date_to
          ),
          'contracts', (
            SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
            FROM public.contracts c
            WHERE c.organization_id = v_report.organization_id
          )
        );
        
      WHEN 'vulnerabilities' THEN
        v_content := jsonb_build_object(
          'report_type', 'vulnerabilities',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'organization', (
            SELECT jsonb_build_object(
              'id', o.id,
              'name', o.name,
              'plan', COALESCE(o.plan_key, o.subscription_tier, 'unknown')
            )
            FROM public.organizations o WHERE o.id = v_report.organization_id
          ),
          'penetration_tests', (
            SELECT COALESCE(jsonb_agg(row_to_json(pt.*)), '[]'::jsonb)
            FROM public.penetration_tests pt
            WHERE pt.organization_id = v_report.organization_id
              AND pt.created_at BETWEEN v_date_from AND v_date_to
          ),
          'security_incidents', (
            SELECT COALESCE(jsonb_agg(row_to_json(si.*)), '[]'::jsonb)
            FROM public.security_incidents si
            WHERE si.organization_id = v_report.organization_id
              AND si.severity IN ('critical', 'high')
              AND si.created_at BETWEEN v_date_from AND v_date_to
          )
        );
        
      WHEN 'billing' THEN
        v_content := jsonb_build_object(
          'report_type', 'billing',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'organization', (
            SELECT jsonb_build_object(
              'id', o.id,
              'name', o.name,
              'plan', COALESCE(o.plan_key, o.subscription_tier, 'unknown'),
              'subscription_tier', o.subscription_tier,
              'current_users_count', o.current_users_count,
              'max_users', o.max_users,
              'storage_used_gb', o.storage_used_gb
            )
            FROM public.organizations o WHERE o.id = v_report.organization_id
          ),
          'billing_events', (
            SELECT COALESCE(jsonb_agg(row_to_json(be.*)), '[]'::jsonb)
            FROM public.billing_events be
            WHERE be.organization_id = v_report.organization_id
              AND be.created_at BETWEEN v_date_from AND v_date_to
          )
        );
        
      ELSE
        v_content := jsonb_build_object(
          'report_type', v_report.report_type,
          'generated_at', now(),
          'error', 'Unknown report type'
        );
    END CASE;
    
    -- Update report as ready
    UPDATE public.reports 
    SET status = 'ready', 
        content = v_content,
        generated_at = now()
    WHERE id = p_report_id;
    
    RETURN v_content;
    
  EXCEPTION WHEN OTHERS THEN
    -- Mark report as failed with error message
    UPDATE public.reports 
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = p_report_id;
    
    RAISE;
  END;
END;
$$;

-- Recreate generate_audit_bundle with correct schema references
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
  v_bundle jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user has access (must be admin of the organization)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Access denied: You must be an organization admin to generate audit bundles';
  END IF;
  
  -- Build the comprehensive audit bundle
  v_bundle := jsonb_build_object(
    'bundle_type', 'full_audit',
    'generated_at', now(),
    'generated_by', v_user_id,
    'date_range', jsonb_build_object('from', p_date_from, 'to', p_date_to),
    
    -- Organization details
    'organization', (
      SELECT jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'plan', COALESCE(o.plan_key, o.subscription_tier, 'unknown'),
        'subscription_tier', o.subscription_tier,
        'current_users_count', o.current_users_count,
        'max_users', o.max_users,
        'storage_used_gb', o.storage_used_gb,
        'created_at', o.created_at
      )
      FROM public.organizations o WHERE o.id = p_organization_id
    ),
    
    -- Organization members
    'members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', om.user_id,
        'role', om.role,
        'joined_at', om.created_at,
        'profile', (
          SELECT jsonb_build_object('full_name', p.full_name, 'email', p.email)
          FROM public.profiles p WHERE p.id = om.user_id
        )
      )), '[]'::jsonb)
      FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
    ),
    
    -- Audit events
    'audit_events', (
      SELECT COALESCE(jsonb_agg(row_to_json(ae.*) ORDER BY ae.created_at DESC), '[]'::jsonb)
      FROM public.audit_events ae
      WHERE ae.organization_id = p_organization_id
        AND ae.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Security incidents
    'security_incidents', (
      SELECT COALESCE(jsonb_agg(row_to_json(si.*) ORDER BY si.created_at DESC), '[]'::jsonb)
      FROM public.security_incidents si
      WHERE si.organization_id = p_organization_id
        AND si.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Access reviews
    'access_reviews', (
      SELECT COALESCE(jsonb_agg(row_to_json(ar.*) ORDER BY ar.created_at DESC), '[]'::jsonb)
      FROM public.access_reviews ar
      WHERE ar.organization_id = p_organization_id
        AND ar.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Data subject requests
    'data_subject_requests', (
      SELECT COALESCE(jsonb_agg(row_to_json(dsr.*) ORDER BY dsr.created_at DESC), '[]'::jsonb)
      FROM public.data_subject_requests dsr
      WHERE dsr.organization_id = p_organization_id
        AND dsr.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- SOC2 controls
    'soc2_controls', (
      SELECT COALESCE(jsonb_agg(row_to_json(sc.*)), '[]'::jsonb)
      FROM public.soc2_controls sc
    ),
    
    -- Control evidence
    'control_evidence', (
      SELECT COALESCE(jsonb_agg(row_to_json(ce.*) ORDER BY ce.collected_at DESC), '[]'::jsonb)
      FROM public.control_evidence ce
      WHERE ce.collected_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Contracts
    'contracts', (
      SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
      FROM public.contracts c
      WHERE c.organization_id = p_organization_id
    ),
    
    -- Penetration tests (using correct table name)
    'penetration_tests', (
      SELECT COALESCE(jsonb_agg(row_to_json(pt.*) ORDER BY pt.created_at DESC), '[]'::jsonb)
      FROM public.penetration_tests pt
      WHERE pt.organization_id = p_organization_id
        AND pt.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Billing events
    'billing_events', (
      SELECT COALESCE(jsonb_agg(row_to_json(be.*) ORDER BY be.created_at DESC), '[]'::jsonb)
      FROM public.billing_events be
      WHERE be.organization_id = p_organization_id
        AND be.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Backups
    'backups', (
      SELECT COALESCE(jsonb_agg(row_to_json(b.*) ORDER BY b.created_at DESC), '[]'::jsonb)
      FROM public.backups b
      WHERE b.created_at BETWEEN p_date_from AND p_date_to
    ),
    
    -- Disaster events
    'disaster_events', (
      SELECT COALESCE(jsonb_agg(row_to_json(de.*) ORDER BY de.created_at DESC), '[]'::jsonb)
      FROM public.disaster_events de
      WHERE de.created_at BETWEEN p_date_from AND p_date_to
    )
  );
  
  RETURN v_bundle;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_report_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_audit_bundle(uuid, timestamptz, timestamptz) TO authenticated;