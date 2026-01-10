-- Step 10: SOC-2 RPC Functions

-- Check if user is platform staff
CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_staff 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Get SOC-2 dashboard
CREATE OR REPLACE FUNCTION public.get_soc2_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'controls', (SELECT jsonb_build_object(
      'total', count(*),
      'by_category', jsonb_object_agg(category, cnt)
    ) FROM (SELECT category, count(*) as cnt FROM soc2_controls WHERE is_active GROUP BY category) c),
    'evidence', jsonb_build_object(
      'total', (SELECT count(*) FROM control_evidence),
      'last_30_days', (SELECT count(*) FROM control_evidence WHERE collected_at > now() - interval '30 days')
    ),
    'reviews', jsonb_build_object(
      'pending', (SELECT count(*) FROM access_reviews WHERE status = 'pending'),
      'in_progress', (SELECT count(*) FROM access_reviews WHERE status = 'in_progress'),
      'completed', (SELECT count(*) FROM access_reviews WHERE status = 'completed')
    ),
    'incidents', jsonb_build_object(
      'open', (SELECT count(*) FROM security_incidents WHERE status IN ('open', 'investigating')),
      'resolved', (SELECT count(*) FROM security_incidents WHERE status = 'resolved')
    ),
    'changes_last_30_days', (SELECT count(*) FROM change_log WHERE created_at > now() - interval '30 days')
  );
END;
$$;

-- Start access review
CREATE OR REPLACE FUNCTION public.start_access_review(p_org_id uuid DEFAULT NULL, p_type text DEFAULT 'quarterly')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review_id uuid;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  INSERT INTO access_reviews (organization_id, review_type, reviewer_id, status)
  VALUES (p_org_id, p_type, auth.uid(), 'in_progress')
  RETURNING id INTO v_review_id;

  -- Add review items for elevated roles
  INSERT INTO access_review_items (review_id, user_id, organization_id, user_role)
  SELECT v_review_id, om.user_id, om.organization_id, om.role
  FROM organization_members om
  WHERE (p_org_id IS NULL OR om.organization_id = p_org_id)
    AND om.role IN ('admin', 'manager');

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('ACCESS_REVIEW_STARTED', auth.uid(), jsonb_build_object('review_id', v_review_id));

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

-- Complete access review item
CREATE OR REPLACE FUNCTION public.complete_review_item(p_item_id uuid, p_action text, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  UPDATE access_review_items
  SET action_taken = p_action, reviewed_by = auth.uid(), reviewed_at = now(), notes = p_notes
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Complete access review
CREATE OR REPLACE FUNCTION public.complete_access_review(p_review_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending int;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT count(*) INTO v_pending FROM access_review_items WHERE review_id = p_review_id AND action_taken = 'pending';
  IF v_pending > 0 THEN
    RETURN jsonb_build_object('error', 'Pending items remain', 'count', v_pending);
  END IF;

  UPDATE access_reviews SET status = 'completed', completed_by = auth.uid(), completed_at = now() WHERE id = p_review_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('ACCESS_REVIEW_COMPLETED', auth.uid(), jsonb_build_object('review_id', p_review_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Log security incident
CREATE OR REPLACE FUNCTION public.log_security_incident(p_severity text, p_title text, p_description text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_number text;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  v_number := 'INC-' || to_char(now(), 'YYYYMMDD') || '-' || 
    lpad((SELECT count(*) + 1 FROM security_incidents WHERE created_at::date = now()::date)::text, 3, '0');

  INSERT INTO security_incidents (incident_number, severity, title, description, reported_by)
  VALUES (v_number, p_severity, p_title, p_description, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('SECURITY_INCIDENT_LOGGED', auth.uid(), jsonb_build_object('incident_id', v_id, 'severity', p_severity));

  RETURN jsonb_build_object('success', true, 'incident_id', v_id, 'incident_number', v_number);
END;
$$;

-- Resolve security incident
CREATE OR REPLACE FUNCTION public.resolve_security_incident(p_id uuid, p_resolution text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  UPDATE security_incidents SET status = 'resolved', resolution_summary = p_resolution, resolved_at = now() WHERE id = p_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('SECURITY_INCIDENT_RESOLVED', auth.uid(), jsonb_build_object('incident_id', p_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Log change
CREATE OR REPLACE FUNCTION public.log_platform_change(p_type text, p_title text, p_description text, p_impact text DEFAULT 'low', p_ticket text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  INSERT INTO change_log (change_type, title, description, impact_level, ticket_reference, created_by)
  VALUES (p_type, p_title, p_description, p_impact, p_ticket, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'change_id', v_id);
END;
$$;

-- Collect RLS evidence
CREATE OR REPLACE FUNCTION public.collect_rls_evidence()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence_id uuid;
  v_data jsonb;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'collected_at', now(),
    'total_policies', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
    'tables_with_rls', (SELECT count(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public')
  ) INTO v_data;

  INSERT INTO control_evidence (control_id, evidence_type, description, source, metadata, collected_by)
  SELECT id, 'snapshot', 'RLS policies snapshot', 'system', v_data, auth.uid()
  FROM soc2_controls WHERE control_code = 'CC6.1'
  RETURNING id INTO v_evidence_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('CONTROL_EVIDENCE_COLLECTED', auth.uid(), jsonb_build_object('evidence_id', v_evidence_id, 'control', 'CC6.1'));

  RETURN jsonb_build_object('success', true, 'evidence_id', v_evidence_id);
END;
$$;

-- Collect audit log evidence
CREATE OR REPLACE FUNCTION public.collect_audit_evidence(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence_id uuid;
  v_data jsonb;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'collected_at', now(),
    'period_days', p_days,
    'total_events', (SELECT count(*) FROM audit_events WHERE created_at > now() - (p_days || ' days')::interval),
    'unique_actors', (SELECT count(DISTINCT actor_user_id) FROM audit_events WHERE created_at > now() - (p_days || ' days')::interval)
  ) INTO v_data;

  INSERT INTO control_evidence (control_id, evidence_type, description, source, metadata, collected_by)
  SELECT id, 'report', 'Audit log summary - ' || p_days || ' days', 'system', v_data, auth.uid()
  FROM soc2_controls WHERE control_code = 'CC7.2'
  RETURNING id INTO v_evidence_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('CONTROL_EVIDENCE_COLLECTED', auth.uid(), jsonb_build_object('evidence_id', v_evidence_id, 'control', 'CC7.2'));

  RETURN jsonb_build_object('success', true, 'evidence_id', v_evidence_id);
END;
$$;