-- Step 13: Pen-Testing & Vulnerability Management

-- 1. Create enums
CREATE TYPE pentest_type AS ENUM ('external', 'internal', 'web_app', 'api', 'mobile', 'social_engineering');
CREATE TYPE pentest_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE risk_level AS ENUM ('informational', 'low', 'medium', 'high', 'critical');
CREATE TYPE vulnerability_source AS ENUM ('pentest', 'scanner', 'responsible_disclosure', 'internal', 'customer_report');
CREATE TYPE vulnerability_status AS ENUM ('open', 'in_progress', 'mitigated', 'accepted_risk', 'closed');
CREATE TYPE security_report_status AS ENUM ('new', 'triaged', 'accepted', 'rejected', 'duplicate');

-- 2. Penetration tests table
CREATE TABLE IF NOT EXISTS public.penetration_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  test_type pentest_type NOT NULL,
  scope text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  report_file_path text,
  overall_risk risk_level,
  findings_count_critical integer DEFAULT 0,
  findings_count_high integer DEFAULT 0,
  findings_count_medium integer DEFAULT 0,
  findings_count_low integer DEFAULT 0,
  findings_count_info integer DEFAULT 0,
  status pentest_status NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  completed_at timestamptz
);

-- 3. Vulnerabilities table
CREATE TABLE IF NOT EXISTS public.vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source vulnerability_source NOT NULL,
  pen_test_id uuid REFERENCES public.penetration_tests(id),
  title text NOT NULL,
  description text NOT NULL,
  severity risk_level NOT NULL,
  cvss_score numeric(3,1),
  affected_component text NOT NULL,
  status vulnerability_status NOT NULL DEFAULT 'open',
  owner_user_id uuid REFERENCES public.profiles(id),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  sla_due_at timestamptz,
  closed_at timestamptz,
  resolution_summary text,
  evidence_file_path text,
  accepted_risk_justification text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Security reports (public submission)
CREATE TABLE IF NOT EXISTS public.security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_email text NOT NULL,
  reporter_name text,
  description text NOT NULL,
  steps_to_reproduce text,
  impact_assessment text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status security_report_status NOT NULL DEFAULT 'new',
  linked_vulnerability_id uuid REFERENCES public.vulnerabilities(id),
  triaged_by uuid REFERENCES public.profiles(id),
  triaged_at timestamptz,
  internal_notes text
);

-- 5. Vulnerability SLA configuration
CREATE TABLE IF NOT EXISTS public.vulnerability_sla_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity risk_level NOT NULL UNIQUE,
  sla_days integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Insert default SLAs
INSERT INTO public.vulnerability_sla_config (severity, sla_days) VALUES
  ('critical', 7),
  ('high', 14),
  ('medium', 30),
  ('low', 90),
  ('informational', 365);

-- 6. Enable RLS
ALTER TABLE public.penetration_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_sla_config ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Penetration tests - Platform staff only
CREATE POLICY "Platform staff can manage penetration tests"
  ON public.penetration_tests FOR ALL
  USING (public.is_platform_staff(auth.uid()));

-- Vulnerabilities - Platform staff and owners
CREATE POLICY "Platform staff can manage vulnerabilities"
  ON public.vulnerabilities FOR ALL
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Owners can view their vulnerabilities"
  ON public.vulnerabilities FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Owners can update their vulnerabilities"
  ON public.vulnerabilities FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Security reports - Public insert, platform staff review
CREATE POLICY "Anyone can submit security reports"
  ON public.security_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Platform staff can manage security reports"
  ON public.security_reports FOR ALL
  USING (public.is_platform_staff(auth.uid()));

-- SLA config - Platform staff only
CREATE POLICY "Platform staff can view SLA config"
  ON public.vulnerability_sla_config FOR SELECT
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update SLA config"
  ON public.vulnerability_sla_config FOR UPDATE
  USING (public.is_platform_staff(auth.uid()));

-- 8. Function: Calculate SLA due date
CREATE OR REPLACE FUNCTION public.calculate_vulnerability_sla(p_severity text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sla_days integer;
BEGIN
  SELECT sla_days INTO v_sla_days
  FROM vulnerability_sla_config
  WHERE severity = p_severity::risk_level;
  
  IF v_sla_days IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN now() + (v_sla_days || ' days')::interval;
END;
$$;

-- 9. Trigger: Auto-calculate SLA on vulnerability insert
CREATE OR REPLACE FUNCTION public.set_vulnerability_sla()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := public.calculate_vulnerability_sla(NEW.severity::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_vulnerability_sla
  BEFORE INSERT ON public.vulnerabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vulnerability_sla();

-- 10. RPC: Create penetration test
CREATE OR REPLACE FUNCTION public.create_pentest(
  p_vendor_name text,
  p_test_type text,
  p_scope text,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO penetration_tests (vendor_name, test_type, scope, start_date, end_date, notes, created_by)
  VALUES (p_vendor_name, p_test_type::pentest_type, p_scope, p_start_date, p_end_date, p_notes, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('PENTEST_CREATED', auth.uid(), jsonb_build_object('pentest_id', v_id, 'vendor', p_vendor_name));

  RETURN v_id;
END;
$$;

-- 11. RPC: Complete penetration test
CREATE OR REPLACE FUNCTION public.complete_pentest(
  p_pentest_id uuid,
  p_overall_risk text,
  p_findings_critical integer DEFAULT 0,
  p_findings_high integer DEFAULT 0,
  p_findings_medium integer DEFAULT 0,
  p_findings_low integer DEFAULT 0,
  p_findings_info integer DEFAULT 0,
  p_report_file_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE penetration_tests
  SET
    status = 'completed',
    completed_at = now(),
    overall_risk = p_overall_risk::risk_level,
    findings_count_critical = p_findings_critical,
    findings_count_high = p_findings_high,
    findings_count_medium = p_findings_medium,
    findings_count_low = p_findings_low,
    findings_count_info = p_findings_info,
    report_file_path = p_report_file_path
  WHERE id = p_pentest_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('PENTEST_COMPLETED', auth.uid(), jsonb_build_object('pentest_id', p_pentest_id, 'overall_risk', p_overall_risk));
END;
$$;

-- 12. RPC: Create vulnerability
CREATE OR REPLACE FUNCTION public.create_vulnerability(
  p_source text,
  p_title text,
  p_description text,
  p_severity text,
  p_affected_component text,
  p_pen_test_id uuid DEFAULT NULL,
  p_cvss_score numeric DEFAULT NULL,
  p_owner_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO vulnerabilities (
    source, pen_test_id, title, description, severity, 
    affected_component, cvss_score, owner_user_id, created_by
  )
  VALUES (
    p_source::vulnerability_source, p_pen_test_id, p_title, p_description, 
    p_severity::risk_level, p_affected_component, p_cvss_score, 
    COALESCE(p_owner_user_id, auth.uid()), auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES ('VULNERABILITY_CREATED', auth.uid(), jsonb_build_object(
    'vulnerability_id', v_id, 
    'title', p_title, 
    'severity', p_severity
  ));

  RETURN v_id;
END;
$$;

-- 13. RPC: Update vulnerability status
CREATE OR REPLACE FUNCTION public.update_vulnerability_status(
  p_vulnerability_id uuid,
  p_new_status text,
  p_resolution_summary text DEFAULT NULL,
  p_accepted_risk_justification text DEFAULT NULL,
  p_evidence_file_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_action text;
BEGIN
  -- Check access
  IF NOT public.is_platform_staff(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM vulnerabilities WHERE id = p_vulnerability_id AND owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT status::text INTO v_old_status FROM vulnerabilities WHERE id = p_vulnerability_id;

  -- Validate transitions
  IF p_new_status = 'accepted_risk' AND (p_accepted_risk_justification IS NULL OR p_accepted_risk_justification = '') THEN
    RAISE EXCEPTION 'Justification required for accepted risk';
  END IF;

  IF p_new_status = 'closed' AND (p_resolution_summary IS NULL OR p_resolution_summary = '') THEN
    RAISE EXCEPTION 'Resolution summary required to close vulnerability';
  END IF;

  UPDATE vulnerabilities
  SET
    status = p_new_status::vulnerability_status,
    resolution_summary = COALESCE(p_resolution_summary, resolution_summary),
    accepted_risk_justification = COALESCE(p_accepted_risk_justification, accepted_risk_justification),
    evidence_file_path = COALESCE(p_evidence_file_path, evidence_file_path),
    closed_at = CASE WHEN p_new_status IN ('closed', 'accepted_risk') THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_vulnerability_id;

  -- Determine audit action
  v_action := CASE 
    WHEN p_new_status = 'accepted_risk' THEN 'VULNERABILITY_ACCEPTED_RISK'
    WHEN p_new_status = 'closed' THEN 'VULNERABILITY_CLOSED'
    ELSE 'VULNERABILITY_STATUS_CHANGED'
  END;

  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (v_action, auth.uid(), jsonb_build_object(
    'vulnerability_id', p_vulnerability_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  ));
END;
$$;

-- 14. RPC: Submit security report (public)
CREATE OR REPLACE FUNCTION public.submit_security_report(
  p_reporter_email text,
  p_description text,
  p_reporter_name text DEFAULT NULL,
  p_steps_to_reproduce text DEFAULT NULL,
  p_impact_assessment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO security_reports (
    reporter_email, reporter_name, description, 
    steps_to_reproduce, impact_assessment
  )
  VALUES (
    p_reporter_email, p_reporter_name, p_description,
    p_steps_to_reproduce, p_impact_assessment
  )
  RETURNING id INTO v_id;

  INSERT INTO audit_events (action, metadata)
  VALUES ('SECURITY_REPORT_SUBMITTED', jsonb_build_object(
    'report_id', v_id,
    'reporter_email', p_reporter_email
  ));

  RETURN v_id;
END;
$$;

-- 15. RPC: Triage security report
CREATE OR REPLACE FUNCTION public.triage_security_report(
  p_report_id uuid,
  p_status text,
  p_internal_notes text DEFAULT NULL,
  p_linked_vulnerability_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE security_reports
  SET
    status = p_status::security_report_status,
    internal_notes = p_internal_notes,
    linked_vulnerability_id = p_linked_vulnerability_id,
    triaged_by = auth.uid(),
    triaged_at = now()
  WHERE id = p_report_id;
END;
$$;

-- 16. RPC: Get security dashboard metrics
CREATE OR REPLACE FUNCTION public.get_security_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  result := jsonb_build_object(
    'open_vulnerabilities', (
      SELECT jsonb_build_object(
        'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'accepted_risk')),
        'high', COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('closed', 'accepted_risk')),
        'medium', COUNT(*) FILTER (WHERE severity = 'medium' AND status NOT IN ('closed', 'accepted_risk')),
        'low', COUNT(*) FILTER (WHERE severity = 'low' AND status NOT IN ('closed', 'accepted_risk')),
        'informational', COUNT(*) FILTER (WHERE severity = 'informational' AND status NOT IN ('closed', 'accepted_risk'))
      )
      FROM vulnerabilities
    ),
    'overdue_count', (
      SELECT COUNT(*) FROM vulnerabilities 
      WHERE status NOT IN ('closed', 'accepted_risk') 
      AND sla_due_at < now()
    ),
    'accepted_risk_count', (
      SELECT COUNT(*) FROM vulnerabilities WHERE status = 'accepted_risk'
    ),
    'avg_remediation_days', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - discovered_at)) / 86400)::numeric, 1)
      FROM vulnerabilities 
      WHERE status = 'closed' AND closed_at IS NOT NULL
    ),
    'sla_compliance_pct', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE closed_at <= sla_due_at OR sla_due_at IS NULL)::numeric / 
         NULLIF(COUNT(*), 0)::numeric) * 100, 1
      )
      FROM vulnerabilities
      WHERE status = 'closed'
    ),
    'pending_reports', (
      SELECT COUNT(*) FROM security_reports WHERE status = 'new'
    ),
    'recent_pentests', (
      SELECT COUNT(*) FROM penetration_tests 
      WHERE start_date > now() - interval '1 year'
    )
  );

  RETURN result;
END;
$$;