-- Fix: Extract date_from/date_to from filters JSONB instead of non-existent columns
DROP FUNCTION IF EXISTS public.generate_report_content(uuid);

CREATE OR REPLACE FUNCTION public.generate_report_content(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report reports%ROWTYPE;
  v_result jsonb;
  v_user_id uuid;
  v_user_role text;
  v_org_member_ids uuid[];
  v_date_from timestamptz;
  v_date_to timestamptz;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch report
  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  -- Check authorization
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = v_user_id AND organization_id = v_report.organization_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: admin or manager role required';
  END IF;

  -- Extract dates from filters JSONB
  v_date_from := (v_report.filters->>'date_from')::timestamptz;
  v_date_to := (v_report.filters->>'date_to')::timestamptz;

  -- Mark as generating
  UPDATE reports SET status = 'generating' WHERE id = p_report_id;

  -- Get org member IDs for scoping tables without organization_id
  SELECT array_agg(user_id) INTO v_org_member_ids
  FROM organization_members
  WHERE organization_id = v_report.organization_id;

  -- Generate content based on report type
  BEGIN
    CASE v_report.report_type::text
      WHEN 'security' THEN
        SELECT jsonb_build_object(
          'report_type', 'security',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'security_incidents', COALESCE((
            SELECT jsonb_agg(row_to_json(si.*))
            FROM security_incidents si
            WHERE si.reported_by = ANY(v_org_member_ids)
              AND si.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb),
          'vulnerabilities', COALESCE((
            SELECT jsonb_agg(row_to_json(v.*))
            FROM vulnerabilities v
            WHERE v.created_by = ANY(v_org_member_ids)
              AND v.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb),
          'penetration_tests', COALESCE((
            SELECT jsonb_agg(row_to_json(pt.*))
            FROM penetration_tests pt
            WHERE pt.created_by = ANY(v_org_member_ids)
              AND pt.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb)
        ) INTO v_result;

      WHEN 'audit_logs' THEN
        SELECT jsonb_build_object(
          'report_type', 'audit_logs',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'audit_events', COALESCE((
            SELECT jsonb_agg(row_to_json(ae.*))
            FROM audit_events ae
            WHERE ae.organization_id = v_report.organization_id
              AND ae.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb),
          'access_reviews', COALESCE((
            SELECT jsonb_agg(row_to_json(ar.*))
            FROM access_reviews ar
            WHERE ar.organization_id = v_report.organization_id
              AND ar.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb)
        ) INTO v_result;

      WHEN 'compliance' THEN
        SELECT jsonb_build_object(
          'report_type', 'compliance',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'data_subject_requests', COALESCE((
            SELECT jsonb_agg(row_to_json(dsr.*))
            FROM data_subject_requests dsr
            WHERE dsr.organization_id = v_report.organization_id
              AND dsr.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb),
          'contracts', COALESCE((
            SELECT jsonb_agg(row_to_json(c.*))
            FROM contracts c
            WHERE c.organization_id = v_report.organization_id
              AND c.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb),
          'soc2_controls', COALESCE((
            SELECT jsonb_agg(row_to_json(sc.*))
            FROM soc2_controls sc
            WHERE sc.last_reviewed_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb)
        ) INTO v_result;

      WHEN 'vulnerabilities' THEN
        SELECT jsonb_build_object(
          'report_type', 'vulnerabilities',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'vulnerabilities', COALESCE((
            SELECT jsonb_agg(row_to_json(v.*))
            FROM vulnerabilities v
            WHERE v.created_by = ANY(v_org_member_ids)
              AND v.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb),
          'penetration_tests', COALESCE((
            SELECT jsonb_agg(row_to_json(pt.*))
            FROM penetration_tests pt
            WHERE pt.created_by = ANY(v_org_member_ids)
              AND pt.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb)
        ) INTO v_result;

      WHEN 'billing' THEN
        SELECT jsonb_build_object(
          'report_type', 'billing',
          'generated_at', now(),
          'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
          'billing_events', COALESCE((
            SELECT jsonb_agg(row_to_json(be.*))
            FROM billing_events be
            WHERE be.organization_id = v_report.organization_id
              AND be.created_at BETWEEN v_date_from AND v_date_to
          ), '[]'::jsonb)
        ) INTO v_result;

      ELSE
        v_result := jsonb_build_object(
          'error', 'Unknown report type',
          'report_type', v_report.report_type::text
        );
    END CASE;

    -- Update report with content and mark as ready
    UPDATE reports
    SET status = 'ready',
        generated_at = now(),
        content = v_result,
        error_message = NULL
    WHERE id = p_report_id;

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Mark as failed with error message
    UPDATE reports
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = p_report_id;

    RAISE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_report_content(uuid) TO authenticated;