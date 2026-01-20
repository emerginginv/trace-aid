-- Step 17: Enterprise Reporting & Audit Exports

-- Create report_type enum (drop first if exists from failed migration)
DROP TYPE IF EXISTS public.report_type CASCADE;
DROP TYPE IF EXISTS public.report_status CASCADE;

-- Create report_type enum
CREATE TYPE public.report_type AS ENUM ('security', 'audit_logs', 'compliance', 'vulnerabilities', 'billing');

-- Create report_status enum
CREATE TYPE public.report_status AS ENUM ('queued', 'generating', 'ready', 'failed');

-- Create reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type public.report_type NOT NULL,
  title text NOT NULL,
  filters jsonb DEFAULT '{}',
  status public.report_status NOT NULL DEFAULT 'queued',
  file_path text,
  file_size_bytes bigint,
  requested_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  generated_at timestamptz
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports - org admins only
CREATE POLICY "Org admins can view their organization reports"
ON public.reports FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

CREATE POLICY "Org admins can create reports"
ON public.reports FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
  AND requested_by = auth.uid()
);

CREATE POLICY "Org admins can update their organization reports"
ON public.reports FOR UPDATE
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Index for efficient queries
CREATE INDEX idx_reports_organization_id ON public.reports(organization_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_expires_at ON public.reports(expires_at);

-- Function to request a new report
CREATE OR REPLACE FUNCTION public.request_report(
  p_organization_id uuid,
  p_report_type text,
  p_title text,
  p_filters jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_report_count integer;
BEGIN
  -- Check if user is admin for this org
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id 
    AND organization_id = p_organization_id 
    AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only organization admins can request reports';
  END IF;
  
  -- Rate limit: max 10 reports per day per org
  SELECT COUNT(*) INTO v_report_count
  FROM reports
  WHERE organization_id = p_organization_id
  AND created_at > now() - interval '24 hours';
  
  IF v_report_count >= 10 THEN
    RAISE EXCEPTION 'Report generation limit reached. Please try again tomorrow.';
  END IF;
  
  -- Create the report
  INSERT INTO reports (
    organization_id,
    report_type,
    title,
    filters,
    status,
    requested_by,
    expires_at
  )
  VALUES (
    p_organization_id,
    p_report_type::report_type,
    p_title,
    p_filters,
    'queued',
    v_user_id,
    now() + interval '7 days'
  )
  RETURNING id INTO v_report_id;
  
  -- Log audit event
  INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
  VALUES (
    p_organization_id,
    'REPORT_REQUESTED',
    v_user_id,
    jsonb_build_object(
      'report_id', v_report_id,
      'report_type', p_report_type,
      'title', p_title,
      'filters', p_filters
    )
  );
  
  RETURN v_report_id;
END;
$$;

-- Function to generate report content
CREATE OR REPLACE FUNCTION public.generate_report_content(
  p_report_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report record;
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_is_authorized boolean;
  v_date_from timestamptz;
  v_date_to timestamptz;
BEGIN
  -- Get report details
  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  
  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
  
  -- Check authorization (admin for this org)
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id 
    AND organization_id = v_report.organization_id 
    AND role = 'admin'
  ) INTO v_is_authorized;
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to generate this report';
  END IF;
  
  -- Extract date filters
  v_date_from := COALESCE((v_report.filters->>'date_from')::timestamptz, now() - interval '90 days');
  v_date_to := COALESCE((v_report.filters->>'date_to')::timestamptz, now());
  
  -- Update status to generating
  UPDATE reports SET status = 'generating' WHERE id = p_report_id;
  
  -- Generate content based on report type
  CASE v_report.report_type
    WHEN 'security' THEN
      SELECT jsonb_build_object(
        'report_type', 'security',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', o.plan
          )
          FROM organizations o WHERE o.id = v_report.organization_id
        ),
        'users', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', p.id,
            'email', p.email,
            'full_name', p.full_name,
            'role', om.role,
            'created_at', om.created_at
          ))
          FROM organization_members om
          JOIN profiles p ON p.id = om.user_id
          WHERE om.organization_id = v_report.organization_id
        ),
        'recent_access_changes', (
          SELECT jsonb_agg(ae.*)
          FROM audit_events ae
          WHERE ae.organization_id = v_report.organization_id
          AND ae.action IN ('USER_INVITED', 'USER_REMOVED', 'ROLE_CHANGED', 'IMPERSONATION_STARTED')
          AND ae.created_at BETWEEN v_date_from AND v_date_to
          ORDER BY ae.created_at DESC
          LIMIT 100
        ),
        'sso_status', (
          SELECT jsonb_build_object(
            'enabled', COALESCE(ss.sso_enabled, false),
            'provider', ss.sso_provider
          )
          FROM sso_settings ss
          WHERE ss.organization_id = v_report.organization_id
        )
      ) INTO v_result;
      
    WHEN 'audit_logs' THEN
      SELECT jsonb_build_object(
        'report_type', 'audit_logs',
        'generated_at', now(),
        'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
        'events', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', ae.id,
            'action', ae.action,
            'actor_user_id', ae.actor_user_id,
            'metadata', ae.metadata,
            'created_at', ae.created_at
          ))
          FROM audit_events ae
          WHERE ae.organization_id = v_report.organization_id
          AND ae.created_at BETWEEN v_date_from AND v_date_to
          ORDER BY ae.created_at DESC
        ),
        'event_summary', (
          SELECT jsonb_object_agg(action, cnt)
          FROM (
            SELECT action, COUNT(*) as cnt
            FROM audit_events
            WHERE organization_id = v_report.organization_id
            AND created_at BETWEEN v_date_from AND v_date_to
            GROUP BY action
          ) summary
        )
      ) INTO v_result;
      
    WHEN 'compliance' THEN
      SELECT jsonb_build_object(
        'report_type', 'compliance',
        'generated_at', now(),
        'retention_policy', (
          SELECT jsonb_build_object(
            'default_retention_days', o.retention_days
          )
          FROM organizations o WHERE o.id = v_report.organization_id
        ),
        'dsr_requests', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', dsr.id,
            'request_type', dsr.request_type,
            'status', dsr.status,
            'created_at', dsr.created_at,
            'completed_at', dsr.completed_at
          ))
          FROM data_subject_requests dsr
          WHERE dsr.organization_id = v_report.organization_id
          AND dsr.created_at BETWEEN v_date_from AND v_date_to
        ),
        'compliance_exports', (
          SELECT jsonb_agg(ce.*)
          FROM compliance_exports ce
          WHERE ce.requested_by IN (
            SELECT user_id FROM organization_members WHERE organization_id = v_report.organization_id
          )
          AND ce.created_at BETWEEN v_date_from AND v_date_to
        )
      ) INTO v_result;
      
    WHEN 'vulnerabilities' THEN
      SELECT jsonb_build_object(
        'report_type', 'vulnerabilities',
        'generated_at', now(),
        'pen_tests', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', pt.id,
            'test_date', pt.test_date,
            'vendor', pt.vendor,
            'scope', pt.scope,
            'high_findings', pt.high_findings,
            'medium_findings', pt.medium_findings,
            'low_findings', pt.low_findings
          ))
          FROM pen_tests pt
          ORDER BY pt.test_date DESC
          LIMIT 5
        ),
        'vulnerabilities', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', v.id,
            'title', v.title,
            'severity', v.severity,
            'status', v.status,
            'sla_compliant', v.sla_compliant
          ))
          FROM vulnerabilities v
          WHERE v.discovered_at BETWEEN v_date_from AND v_date_to
        ),
        'sla_summary', (
          SELECT jsonb_build_object(
            'total', COUNT(*),
            'compliant', COUNT(*) FILTER (WHERE sla_compliant = true),
            'non_compliant', COUNT(*) FILTER (WHERE sla_compliant = false)
          )
          FROM vulnerabilities
          WHERE discovered_at BETWEEN v_date_from AND v_date_to
        )
      ) INTO v_result;
      
    WHEN 'billing' THEN
      SELECT jsonb_build_object(
        'report_type', 'billing',
        'generated_at', now(),
        'organization', (
          SELECT jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'plan', o.plan,
            'seats_used', o.seats_used,
            'seats_limit', o.seats_limit,
            'storage_used_bytes', o.storage_used_bytes,
            'storage_limit_bytes', o.storage_limit_bytes,
            'cases_used', o.cases_used,
            'cases_limit', o.cases_limit
          )
          FROM organizations o WHERE o.id = v_report.organization_id
        ),
        'contracts', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'contract_type', c.contract_type,
            'status', c.status,
            'effective_date', c.effective_date,
            'expiration_date', c.expiration_date,
            'auto_renews', c.auto_renews
          ))
          FROM contracts c
          WHERE c.organization_id = v_report.organization_id
          AND c.status IN ('active', 'signed')
        )
      ) INTO v_result;
      
    ELSE
      RAISE EXCEPTION 'Unknown report type: %', v_report.report_type;
  END CASE;
  
  -- Mark report as ready
  UPDATE reports 
  SET status = 'ready', generated_at = now()
  WHERE id = p_report_id;
  
  -- Log audit event
  INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
  VALUES (
    v_report.organization_id,
    'REPORT_GENERATED',
    v_user_id,
    jsonb_build_object(
      'report_id', p_report_id,
      'report_type', v_report.report_type
    )
  );
  
  RETURN v_result;
END;
$$;

-- Function to generate audit bundle
CREATE OR REPLACE FUNCTION public.generate_audit_bundle(
  p_organization_id uuid,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_date_from timestamptz := COALESCE(p_date_from, now() - interval '90 days');
  v_date_to timestamptz := COALESCE(p_date_to, now());
  v_bundle jsonb;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id 
    AND organization_id = p_organization_id 
    AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only organization admins can generate audit bundles';
  END IF;
  
  -- Generate comprehensive bundle
  SELECT jsonb_build_object(
    'bundle_type', 'audit_pack',
    'generated_at', now(),
    'generated_by', v_user_id,
    'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to),
    'expires_at', now() + interval '7 days',
    'organization', (
      SELECT jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'plan', o.plan,
        'created_at', o.created_at
      )
      FROM organizations o WHERE o.id = p_organization_id
    ),
    'security_access', jsonb_build_object(
      'users', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', p.id,
          'email', p.email,
          'full_name', p.full_name,
          'role', om.role,
          'created_at', om.created_at
        ))
        FROM organization_members om
        JOIN profiles p ON p.id = om.user_id
        WHERE om.organization_id = p_organization_id
      ),
      'access_events', (
        SELECT jsonb_agg(ae.*)
        FROM audit_events ae
        WHERE ae.organization_id = p_organization_id
        AND ae.action IN ('USER_INVITED', 'USER_REMOVED', 'ROLE_CHANGED', 'IMPERSONATION_STARTED', 'LOGIN', 'LOGOUT')
        AND ae.created_at BETWEEN v_date_from AND v_date_to
        ORDER BY ae.created_at DESC
        LIMIT 500
      )
    ),
    'audit_logs', (
      SELECT jsonb_agg(ae.*)
      FROM audit_events ae
      WHERE ae.organization_id = p_organization_id
      AND ae.created_at BETWEEN v_date_from AND v_date_to
      ORDER BY ae.created_at DESC
      LIMIT 1000
    ),
    'compliance', jsonb_build_object(
      'dsr_requests', (
        SELECT jsonb_agg(dsr.*)
        FROM data_subject_requests dsr
        WHERE dsr.organization_id = p_organization_id
        AND dsr.created_at BETWEEN v_date_from AND v_date_to
      ),
      'retention_policy', (
        SELECT jsonb_build_object('retention_days', o.retention_days)
        FROM organizations o WHERE o.id = p_organization_id
      )
    ),
    'contracts', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'contract_type', c.contract_type,
        'status', c.status,
        'effective_date', c.effective_date,
        'expiration_date', c.expiration_date
      ))
      FROM contracts c
      WHERE c.organization_id = p_organization_id
    ),
    'backup_summary', (
      SELECT jsonb_build_object(
        'total_backups', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'completed'),
        'last_backup', MAX(completed_at)
      )
      FROM backups
      WHERE started_at BETWEEN v_date_from AND v_date_to
    )
  ) INTO v_bundle;
  
  -- Log audit event
  INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
  VALUES (
    p_organization_id,
    'AUDIT_BUNDLE_GENERATED',
    v_user_id,
    jsonb_build_object(
      'date_range', jsonb_build_object('from', v_date_from, 'to', v_date_to)
    )
  );
  
  RETURN v_bundle;
END;
$$;

-- Function to get organization reports
CREATE OR REPLACE FUNCTION public.get_organization_reports(
  p_organization_id uuid
)
RETURNS TABLE (
  id uuid,
  report_type text,
  title text,
  status text,
  filters jsonb,
  requested_by uuid,
  requester_name text,
  expires_at timestamptz,
  created_at timestamptz,
  generated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_authorized boolean;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id 
    AND organization_id = p_organization_id 
    AND role = 'admin'
  ) INTO v_is_authorized;
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to view reports';
  END IF;
  
  RETURN QUERY
  SELECT 
    r.id,
    r.report_type::text,
    r.title,
    r.status::text,
    r.filters,
    r.requested_by,
    p.full_name as requester_name,
    r.expires_at,
    r.created_at,
    r.generated_at
  FROM reports r
  LEFT JOIN profiles p ON p.id = r.requested_by
  WHERE r.organization_id = p_organization_id
  AND r.expires_at > now()
  ORDER BY r.created_at DESC;
END;
$$;

-- Function to log report download
CREATE OR REPLACE FUNCTION public.log_report_download(
  p_report_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report record;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  
  IF v_report IS NOT NULL THEN
    INSERT INTO audit_events (organization_id, action, actor_user_id, metadata)
    VALUES (
      v_report.organization_id,
      'REPORT_DOWNLOADED',
      v_user_id,
      jsonb_build_object(
        'report_id', p_report_id,
        'report_type', v_report.report_type
      )
    );
  END IF;
END;
$$;