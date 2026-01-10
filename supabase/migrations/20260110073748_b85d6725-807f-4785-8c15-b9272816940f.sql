-- Step 18: SLA Tracking & Customer Success Metrics

-- Create enums
CREATE TYPE public.sla_metric AS ENUM ('availability', 'response_time', 'support_response');
CREATE TYPE public.sla_window AS ENUM ('monthly', 'quarterly');
CREATE TYPE public.sla_status AS ENUM ('met', 'breached');
CREATE TYPE public.health_risk_level AS ENUM ('healthy', 'watch', 'at_risk');

-- SLAs table
CREATE TABLE public.slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  metric public.sla_metric NOT NULL,
  target_value numeric NOT NULL,
  measurement_window public.sla_window NOT NULL DEFAULT 'monthly',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric)
);

-- SLA Measurements table
CREATE TABLE public.sla_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_id uuid NOT NULL REFERENCES public.slas(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  measured_value numeric NOT NULL,
  status public.sla_status NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

-- SLA Breaches table
CREATE TABLE public.sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_id uuid NOT NULL REFERENCES public.slas(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  measured_value numeric NOT NULL,
  impact_summary text,
  customer_notified boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Customer Health Snapshots table
CREATE TABLE public.customer_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  active_users_count integer NOT NULL DEFAULT 0,
  cases_created integer NOT NULL DEFAULT 0,
  feature_adoption_score numeric DEFAULT 0,
  sla_breaches_count integer NOT NULL DEFAULT 0,
  support_tickets_count integer NOT NULL DEFAULT 0,
  risk_level public.health_risk_level NOT NULL DEFAULT 'healthy',
  risk_factors jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for slas
CREATE POLICY "Org admins can view their SLAs"
ON public.slas FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

CREATE POLICY "Org admins can manage their SLAs"
ON public.slas FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- RLS for sla_measurements
CREATE POLICY "Org admins can view their SLA measurements"
ON public.sla_measurements FOR SELECT
USING (
  sla_id IN (
    SELECT s.id FROM public.slas s
    WHERE s.organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  )
);

-- RLS for sla_breaches
CREATE POLICY "Org admins can view their SLA breaches"
ON public.sla_breaches FOR SELECT
USING (
  sla_id IN (
    SELECT s.id FROM public.slas s
    WHERE s.organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  )
);

-- RLS for customer_health_snapshots
CREATE POLICY "Org admins can view their health snapshots"
ON public.customer_health_snapshots FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Indexes
CREATE INDEX idx_slas_organization_id ON public.slas(organization_id);
CREATE INDEX idx_sla_measurements_sla_id ON public.sla_measurements(sla_id);
CREATE INDEX idx_sla_measurements_period ON public.sla_measurements(period_start, period_end);
CREATE INDEX idx_sla_breaches_sla_id ON public.sla_breaches(sla_id);
CREATE INDEX idx_customer_health_org ON public.customer_health_snapshots(organization_id);
CREATE INDEX idx_customer_health_period ON public.customer_health_snapshots(period_start, period_end);

-- Function to create or update SLA for an organization
CREATE OR REPLACE FUNCTION public.upsert_sla(
  p_organization_id uuid,
  p_metric text,
  p_target_value numeric,
  p_measurement_window text DEFAULT 'monthly',
  p_contract_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sla_id uuid;
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id AND organization_id = p_organization_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only organization admins can manage SLAs';
  END IF;
  
  -- Upsert SLA
  INSERT INTO slas (organization_id, contract_id, metric, target_value, measurement_window)
  VALUES (p_organization_id, p_contract_id, p_metric::sla_metric, p_target_value, p_measurement_window::sla_window)
  ON CONFLICT (organization_id, metric) 
  DO UPDATE SET 
    target_value = EXCLUDED.target_value,
    measurement_window = EXCLUDED.measurement_window,
    contract_id = EXCLUDED.contract_id,
    enabled = true
  RETURNING id INTO v_sla_id;
  
  RETURN v_sla_id;
END;
$$;

-- Function to get SLA summary for an organization
CREATE OR REPLACE FUNCTION public.get_organization_sla_summary(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id AND organization_id = p_organization_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  SELECT jsonb_build_object(
    'slas', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'metric', s.metric,
        'target_value', s.target_value,
        'measurement_window', s.measurement_window,
        'enabled', s.enabled,
        'latest_measurement', (
          SELECT jsonb_build_object(
            'value', sm.measured_value,
            'status', sm.status,
            'period_start', sm.period_start,
            'period_end', sm.period_end,
            'calculated_at', sm.calculated_at
          )
          FROM sla_measurements sm
          WHERE sm.sla_id = s.id
          ORDER BY sm.calculated_at DESC
          LIMIT 1
        ),
        'breaches_count', (
          SELECT COUNT(*) FROM sla_breaches sb WHERE sb.sla_id = s.id
        )
      ))
      FROM slas s
      WHERE s.organization_id = p_organization_id AND s.enabled = true
    ),
    'recent_breaches', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', sb.id,
        'metric', s.metric,
        'period_start', sb.period_start,
        'period_end', sb.period_end,
        'measured_value', sb.measured_value,
        'target_value', s.target_value,
        'impact_summary', sb.impact_summary,
        'resolved_at', sb.resolved_at
      ))
      FROM sla_breaches sb
      JOIN slas s ON s.id = sb.sla_id
      WHERE s.organization_id = p_organization_id
      ORDER BY sb.created_at DESC
      LIMIT 10
    ),
    'health', (
      SELECT jsonb_build_object(
        'risk_level', chs.risk_level,
        'active_users', chs.active_users_count,
        'cases_created', chs.cases_created,
        'adoption_score', chs.feature_adoption_score,
        'period_start', chs.period_start,
        'period_end', chs.period_end
      )
      FROM customer_health_snapshots chs
      WHERE chs.organization_id = p_organization_id
      ORDER BY chs.created_at DESC
      LIMIT 1
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Function to calculate and store customer health snapshot
CREATE OR REPLACE FUNCTION public.calculate_customer_health(
  p_organization_id uuid,
  p_period_start timestamptz DEFAULT NULL,
  p_period_end timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id uuid;
  v_period_start timestamptz := COALESCE(p_period_start, date_trunc('month', now() - interval '1 month'));
  v_period_end timestamptz := COALESCE(p_period_end, date_trunc('month', now()));
  v_active_users integer;
  v_cases_created integer;
  v_sla_breaches integer;
  v_adoption_score numeric;
  v_risk_level health_risk_level := 'healthy';
  v_risk_factors jsonb := '[]'::jsonb;
BEGIN
  -- Count active users (users who logged in during period)
  SELECT COUNT(DISTINCT ae.actor_user_id) INTO v_active_users
  FROM audit_events ae
  WHERE ae.organization_id = p_organization_id
  AND ae.action = 'LOGIN'
  AND ae.created_at BETWEEN v_period_start AND v_period_end;
  
  -- Count cases created
  SELECT COUNT(*) INTO v_cases_created
  FROM cases c
  WHERE c.organization_id = p_organization_id
  AND c.created_at BETWEEN v_period_start AND v_period_end;
  
  -- Count SLA breaches
  SELECT COUNT(*) INTO v_sla_breaches
  FROM sla_breaches sb
  JOIN slas s ON s.id = sb.sla_id
  WHERE s.organization_id = p_organization_id
  AND sb.created_at BETWEEN v_period_start AND v_period_end;
  
  -- Calculate adoption score (simplified: based on feature usage)
  SELECT LEAST(100, (
    COALESCE((SELECT COUNT(*) FROM case_updates WHERE organization_id = p_organization_id AND created_at BETWEEN v_period_start AND v_period_end), 0) * 2 +
    COALESCE((SELECT COUNT(*) FROM case_attachments WHERE organization_id = p_organization_id AND created_at BETWEEN v_period_start AND v_period_end), 0) * 3 +
    COALESCE((SELECT COUNT(*) FROM case_finances WHERE organization_id = p_organization_id AND created_at BETWEEN v_period_start AND v_period_end), 0) * 5
  ) / GREATEST(v_cases_created, 1)) INTO v_adoption_score;
  
  -- Determine risk level
  IF v_active_users = 0 THEN
    v_risk_level := 'at_risk';
    v_risk_factors := v_risk_factors || '["No active users in period"]'::jsonb;
  ELSIF v_sla_breaches > 0 THEN
    v_risk_level := 'watch';
    v_risk_factors := v_risk_factors || '["SLA breaches detected"]'::jsonb;
  ELSIF v_cases_created = 0 AND v_adoption_score < 20 THEN
    v_risk_level := 'watch';
    v_risk_factors := v_risk_factors || '["Low platform usage"]'::jsonb;
  END IF;
  
  -- Insert snapshot
  INSERT INTO customer_health_snapshots (
    organization_id,
    period_start,
    period_end,
    active_users_count,
    cases_created,
    feature_adoption_score,
    sla_breaches_count,
    risk_level,
    risk_factors
  ) VALUES (
    p_organization_id,
    v_period_start,
    v_period_end,
    v_active_users,
    v_cases_created,
    v_adoption_score,
    v_sla_breaches,
    v_risk_level,
    v_risk_factors
  )
  RETURNING id INTO v_snapshot_id;
  
  -- Log audit event
  INSERT INTO audit_events (organization_id, action, metadata)
  VALUES (
    p_organization_id,
    'CUSTOMER_HEALTH_UPDATED',
    jsonb_build_object(
      'snapshot_id', v_snapshot_id,
      'risk_level', v_risk_level,
      'period', jsonb_build_object('start', v_period_start, 'end', v_period_end)
    )
  );
  
  RETURN v_snapshot_id;
END;
$$;

-- Function to get customer success overview (for platform admins)
CREATE OR REPLACE FUNCTION public.get_customer_success_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_organizations', (SELECT COUNT(*) FROM organizations WHERE is_active = true),
      'healthy', (
        SELECT COUNT(DISTINCT chs.organization_id)
        FROM customer_health_snapshots chs
        WHERE chs.risk_level = 'healthy'
        AND chs.created_at > now() - interval '30 days'
      ),
      'watch', (
        SELECT COUNT(DISTINCT chs.organization_id)
        FROM customer_health_snapshots chs
        WHERE chs.risk_level = 'watch'
        AND chs.created_at > now() - interval '30 days'
      ),
      'at_risk', (
        SELECT COUNT(DISTINCT chs.organization_id)
        FROM customer_health_snapshots chs
        WHERE chs.risk_level = 'at_risk'
        AND chs.created_at > now() - interval '30 days'
      ),
      'total_sla_breaches', (
        SELECT COUNT(*) FROM sla_breaches WHERE created_at > now() - interval '90 days'
      )
    ),
    'at_risk_orgs', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'plan', o.subscription_tier,
        'risk_level', chs.risk_level,
        'risk_factors', chs.risk_factors,
        'active_users', chs.active_users_count,
        'sla_breaches', chs.sla_breaches_count
      ))
      FROM organizations o
      JOIN customer_health_snapshots chs ON chs.organization_id = o.id
      WHERE chs.risk_level IN ('watch', 'at_risk')
      AND chs.created_at > now() - interval '30 days'
      ORDER BY 
        CASE chs.risk_level WHEN 'at_risk' THEN 1 WHEN 'watch' THEN 2 ELSE 3 END,
        chs.created_at DESC
      LIMIT 20
    ),
    'upcoming_renewals', (
      SELECT jsonb_agg(jsonb_build_object(
        'org_id', c.organization_id,
        'org_name', o.name,
        'contract_title', c.title,
        'expiration_date', c.expiration_date,
        'days_until_expiry', EXTRACT(DAY FROM c.expiration_date - now())
      ))
      FROM contracts c
      JOIN organizations o ON o.id = c.organization_id
      WHERE c.status = 'active'
      AND c.expiration_date BETWEEN now() AND now() + interval '90 days'
      ORDER BY c.expiration_date
      LIMIT 20
    ),
    'recent_breaches', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', sb.id,
        'org_id', s.organization_id,
        'org_name', o.name,
        'metric', s.metric,
        'measured_value', sb.measured_value,
        'target_value', s.target_value,
        'created_at', sb.created_at,
        'resolved', sb.resolved_at IS NOT NULL
      ))
      FROM sla_breaches sb
      JOIN slas s ON s.id = sb.sla_id
      JOIN organizations o ON o.id = s.organization_id
      ORDER BY sb.created_at DESC
      LIMIT 10
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;