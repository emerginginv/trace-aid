-- =====================================================
-- Budget Consumption Logic: Dynamic Calculation
-- Compute from: Activities → Case Service Instance → Pricing Rule
-- =====================================================

-- Create budget_violation_events table for audit trail
CREATE TABLE IF NOT EXISTS public.budget_violation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  violation_type TEXT NOT NULL CHECK (violation_type IN ('warning', 'exceeded', 'blocked')),
  budget_scope TEXT NOT NULL CHECK (budget_scope IN ('case', 'service')),
  service_instance_id UUID REFERENCES public.case_service_instances(id) ON DELETE CASCADE,
  hours_at_violation NUMERIC(10, 2),
  amount_at_violation NUMERIC(12, 2),
  hours_limit NUMERIC(10, 2),
  amount_limit NUMERIC(12, 2),
  action_attempted TEXT,
  action_blocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_budget_violations_case ON public.budget_violation_events(case_id);
CREATE INDEX idx_budget_violations_org ON public.budget_violation_events(organization_id);
CREATE INDEX idx_budget_violations_created ON public.budget_violation_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.budget_violation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view budget violations in their organization"
ON public.budget_violation_events FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create budget violation events"
ON public.budget_violation_events FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Updated function to compute budget consumption dynamically
-- This calculates from Activities → Case Service Instance → Pricing Rule
CREATE OR REPLACE FUNCTION public.compute_case_budget_consumption(p_case_id UUID)
RETURNS TABLE (
  hours_consumed NUMERIC,
  amount_consumed NUMERIC,
  hours_from_activities NUMERIC,
  amount_from_activities NUMERIC,
  hours_from_services NUMERIC,
  amount_from_services NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pricing_profile_id UUID;
  v_hours_activities NUMERIC := 0;
  v_amount_activities NUMERIC := 0;
  v_hours_services NUMERIC := 0;
  v_amount_services NUMERIC := 0;
BEGIN
  -- Get the pricing profile for this case
  SELECT pricing_profile_id INTO v_pricing_profile_id
  FROM cases WHERE id = p_case_id;

  -- Calculate hours from case_activities (time-based activities)
  -- Activities linked to service instances use service pricing
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN ca.activity_type IN ('time_entry', 'field_work', 'research', 'surveillance') THEN
          COALESCE(
            -- Extract hours from the activity's duration or hours field
            EXTRACT(EPOCH FROM (ca.completed_at - ca.created_at)) / 3600,
            1 -- Default 1 hour if no duration
          )
        ELSE 0
      END
    ), 0)
  INTO v_hours_activities
  FROM case_activities ca
  WHERE ca.case_id = p_case_id
    AND ca.status != 'cancelled';

  -- Calculate amount from activities by looking up pricing rules
  -- Activities → Service Instance → Case Service → Pricing Rate
  SELECT COALESCE(SUM(
    CASE 
      WHEN csi.id IS NOT NULL AND cs.default_rate IS NOT NULL THEN
        -- Use service rate from case_services
        COALESCE(csi.quantity_actual, 1) * cs.default_rate
      WHEN psr.rate IS NOT NULL THEN
        -- Use pricing profile rate if available
        COALESCE(csi.quantity_actual, 1) * psr.rate
      ELSE
        -- Fallback: use case_finances if linked
        COALESCE(cf.amount, 0)
      END
  ), 0)
  INTO v_amount_activities
  FROM case_activities ca
  LEFT JOIN case_service_instances csi ON ca.case_service_instance_id = csi.id
  LEFT JOIN case_services cs ON csi.case_service_id = cs.id
  LEFT JOIN pricing_service_rates psr ON psr.pricing_profile_id = v_pricing_profile_id 
    AND psr.case_service_id = cs.id
  LEFT JOIN case_finances cf ON cf.activity_id = ca.id
  WHERE ca.case_id = p_case_id
    AND ca.status != 'cancelled';

  -- Calculate from service instances directly (scheduled/completed services)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN cs.track_duration = true THEN
          COALESCE(csi.quantity_actual, csi.quantity_estimated, 0) * 
          COALESCE(cs.default_duration_minutes, 60) / 60.0
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN psr.rate IS NOT NULL THEN
          COALESCE(csi.quantity_actual, csi.quantity_estimated, 1) * psr.rate
        WHEN cs.default_rate IS NOT NULL THEN
          COALESCE(csi.quantity_actual, csi.quantity_estimated, 1) * cs.default_rate
        ELSE 0
      END
    ), 0)
  INTO v_hours_services, v_amount_services
  FROM case_service_instances csi
  JOIN case_services cs ON csi.case_service_id = cs.id
  LEFT JOIN pricing_service_rates psr ON psr.pricing_profile_id = v_pricing_profile_id 
    AND psr.case_service_id = cs.id
  WHERE csi.case_id = p_case_id
    AND csi.status NOT IN ('cancelled', 'unscheduled');

  -- Return combined totals
  RETURN QUERY SELECT
    v_hours_activities + v_hours_services,
    v_amount_activities + v_amount_services,
    v_hours_activities,
    v_amount_activities,
    v_hours_services,
    v_amount_services;
END;
$$;

-- Update get_case_budget_summary to use new consumption calculation
CREATE OR REPLACE FUNCTION public.get_case_budget_summary(p_case_id UUID)
RETURNS TABLE (
  budget_hours_authorized NUMERIC,
  budget_dollars_authorized NUMERIC,
  hours_consumed NUMERIC,
  dollars_consumed NUMERIC,
  hours_remaining NUMERIC,
  dollars_remaining NUMERIC,
  hours_utilization_pct NUMERIC,
  dollars_utilization_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_hours NUMERIC;
  v_auth_dollars NUMERIC;
  v_consumed_hours NUMERIC;
  v_consumed_dollars NUMERIC;
BEGIN
  -- Get authorized budget from case_budgets (new table) or cases (legacy)
  SELECT 
    COALESCE(cb.total_budget_hours, c.budget_hours, 0),
    COALESCE(cb.total_budget_amount, c.budget_dollars, 0)
  INTO v_auth_hours, v_auth_dollars
  FROM cases c
  LEFT JOIN case_budgets cb ON cb.case_id = c.id
  WHERE c.id = p_case_id;

  -- Get consumed from dynamic calculation
  SELECT 
    comp.hours_consumed,
    comp.amount_consumed
  INTO v_consumed_hours, v_consumed_dollars
  FROM compute_case_budget_consumption(p_case_id) comp;

  -- Return the summary
  RETURN QUERY SELECT
    v_auth_hours,
    v_auth_dollars,
    COALESCE(v_consumed_hours, 0),
    COALESCE(v_consumed_dollars, 0),
    v_auth_hours - COALESCE(v_consumed_hours, 0),
    v_auth_dollars - COALESCE(v_consumed_dollars, 0),
    CASE WHEN v_auth_hours > 0 
      THEN ROUND((COALESCE(v_consumed_hours, 0) / v_auth_hours) * 100, 2) 
      ELSE 0 END,
    CASE WHEN v_auth_dollars > 0 
      THEN ROUND((COALESCE(v_consumed_dollars, 0) / v_auth_dollars) * 100, 2) 
      ELSE 0 END;
END;
$$;

-- Function to log budget violation events
CREATE OR REPLACE FUNCTION public.log_budget_violation(
  p_case_id UUID,
  p_violation_type TEXT,
  p_budget_scope TEXT,
  p_service_instance_id UUID DEFAULT NULL,
  p_hours_at_violation NUMERIC DEFAULT NULL,
  p_amount_at_violation NUMERIC DEFAULT NULL,
  p_hours_limit NUMERIC DEFAULT NULL,
  p_amount_limit NUMERIC DEFAULT NULL,
  p_action_attempted TEXT DEFAULT NULL,
  p_action_blocked BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_event_id UUID;
BEGIN
  -- Get organization from case
  SELECT organization_id INTO v_org_id FROM cases WHERE id = p_case_id;
  
  INSERT INTO budget_violation_events (
    case_id,
    organization_id,
    user_id,
    violation_type,
    budget_scope,
    service_instance_id,
    hours_at_violation,
    amount_at_violation,
    hours_limit,
    amount_limit,
    action_attempted,
    action_blocked,
    metadata
  ) VALUES (
    p_case_id,
    v_org_id,
    auth.uid(),
    p_violation_type,
    p_budget_scope,
    p_service_instance_id,
    p_hours_at_violation,
    p_amount_at_violation,
    p_hours_limit,
    p_amount_limit,
    p_action_attempted,
    p_action_blocked,
    jsonb_build_object(
      'timestamp', now(),
      'user_id', auth.uid()
    )
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Enhanced check_budget_cap that logs violations
CREATE OR REPLACE FUNCTION public.check_budget_cap(
  p_case_id UUID,
  p_additional_hours NUMERIC DEFAULT 0,
  p_additional_amount NUMERIC DEFAULT 0,
  p_action_type TEXT DEFAULT 'activity'
)
RETURNS TABLE (
  can_proceed BOOLEAN,
  warning_message TEXT,
  budget_type TEXT,
  hard_cap BOOLEAN,
  hours_remaining NUMERIC,
  amount_remaining NUMERIC,
  would_exceed_hours BOOLEAN,
  would_exceed_amount BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_summary RECORD;
  v_hours_remaining NUMERIC;
  v_amount_remaining NUMERIC;
  v_would_exceed_hours BOOLEAN := false;
  v_would_exceed_amount BOOLEAN := false;
  v_warning TEXT := NULL;
  v_can_proceed BOOLEAN := true;
  v_violation_type TEXT;
BEGIN
  -- Get the budget for this case
  SELECT cb.* INTO v_budget
  FROM case_budgets cb
  WHERE cb.case_id = p_case_id;
  
  -- If no budget exists, allow everything
  IF v_budget IS NULL THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      NULL::TEXT,
      NULL::TEXT,
      false::BOOLEAN,
      NULL::NUMERIC,
      NULL::NUMERIC,
      false::BOOLEAN,
      false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Get current consumption using dynamic calculation
  SELECT * INTO v_summary
  FROM get_case_budget_summary(p_case_id) AS s
  LIMIT 1;
  
  -- Calculate remaining
  v_hours_remaining := COALESCE(v_budget.total_budget_hours, 0) - COALESCE(v_summary.hours_consumed, 0);
  v_amount_remaining := COALESCE(v_budget.total_budget_amount, 0) - COALESCE(v_summary.dollars_consumed, 0);
  
  -- Check if additional work would exceed budget
  IF v_budget.budget_type IN ('hours', 'both') AND v_budget.total_budget_hours IS NOT NULL THEN
    v_would_exceed_hours := (v_hours_remaining - p_additional_hours) < 0;
  END IF;
  
  IF v_budget.budget_type IN ('money', 'both') AND v_budget.total_budget_amount IS NOT NULL THEN
    v_would_exceed_amount := (v_amount_remaining - p_additional_amount) < 0;
  END IF;
  
  -- Determine if we can proceed and generate warning
  IF v_would_exceed_hours OR v_would_exceed_amount THEN
    IF v_budget.hard_cap THEN
      v_can_proceed := false;
      v_warning := 'Budget limit reached. This case has a hard cap - no additional work can be logged without increasing the budget.';
      v_violation_type := 'blocked';
    ELSE
      v_warning := 'Warning: This action will exceed the authorized budget.';
      v_violation_type := 'exceeded';
    END IF;
    
    -- Log the violation event
    PERFORM log_budget_violation(
      p_case_id,
      v_violation_type,
      'case',
      NULL,
      v_summary.hours_consumed + p_additional_hours,
      v_summary.dollars_consumed + p_additional_amount,
      v_budget.total_budget_hours,
      v_budget.total_budget_amount,
      p_action_type,
      NOT v_can_proceed
    );
  ELSIF v_summary.hours_utilization_pct >= 80 OR v_summary.dollars_utilization_pct >= 80 THEN
    -- Log warning threshold events
    PERFORM log_budget_violation(
      p_case_id,
      'warning',
      'case',
      NULL,
      v_summary.hours_consumed,
      v_summary.dollars_consumed,
      v_budget.total_budget_hours,
      v_budget.total_budget_amount,
      p_action_type,
      false
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_can_proceed,
    v_warning,
    v_budget.budget_type,
    v_budget.hard_cap,
    v_hours_remaining,
    v_amount_remaining,
    v_would_exceed_hours,
    v_would_exceed_amount;
END;
$$;

-- Function to get real-time budget status with consumption breakdown
CREATE OR REPLACE FUNCTION public.get_realtime_budget_status(p_case_id UUID)
RETURNS TABLE (
  has_budget BOOLEAN,
  budget_type TEXT,
  hard_cap BOOLEAN,
  hours_authorized NUMERIC,
  hours_consumed NUMERIC,
  hours_remaining NUMERIC,
  hours_utilization_pct NUMERIC,
  amount_authorized NUMERIC,
  amount_consumed NUMERIC,
  amount_remaining NUMERIC,
  amount_utilization_pct NUMERIC,
  is_warning BOOLEAN,
  is_exceeded BOOLEAN,
  is_blocked BOOLEAN,
  hours_from_activities NUMERIC,
  hours_from_services NUMERIC,
  amount_from_activities NUMERIC,
  amount_from_services NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_consumption RECORD;
  v_summary RECORD;
BEGIN
  -- Get budget config
  SELECT * INTO v_budget FROM case_budgets WHERE case_id = p_case_id;
  
  -- If no budget, return minimal info
  IF v_budget IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, false,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
      false, false, false,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Get consumption breakdown
  SELECT * INTO v_consumption FROM compute_case_budget_consumption(p_case_id);
  
  -- Get summary with utilization
  SELECT * INTO v_summary FROM get_case_budget_summary(p_case_id);
  
  RETURN QUERY SELECT
    true,
    v_budget.budget_type,
    v_budget.hard_cap,
    COALESCE(v_budget.total_budget_hours, 0),
    v_consumption.hours_consumed,
    COALESCE(v_budget.total_budget_hours, 0) - v_consumption.hours_consumed,
    v_summary.hours_utilization_pct,
    COALESCE(v_budget.total_budget_amount, 0),
    v_consumption.amount_consumed,
    COALESCE(v_budget.total_budget_amount, 0) - v_consumption.amount_consumed,
    v_summary.dollars_utilization_pct,
    v_summary.hours_utilization_pct >= 80 OR v_summary.dollars_utilization_pct >= 80,
    v_summary.hours_utilization_pct >= 100 OR v_summary.dollars_utilization_pct >= 100,
    v_budget.hard_cap AND (v_summary.hours_utilization_pct >= 100 OR v_summary.dollars_utilization_pct >= 100),
    v_consumption.hours_from_activities,
    v_consumption.hours_from_services,
    v_consumption.amount_from_activities,
    v_consumption.amount_from_services;
END;
$$;

-- Add permission for viewing budget violations
INSERT INTO permissions (role, feature_key, allowed) VALUES
  ('admin', 'view_budget_violations', true),
  ('manager', 'view_budget_violations', true),
  ('investigator', 'view_budget_violations', false),
  ('vendor', 'view_budget_violations', false),
  ('member', 'view_budget_violations', false)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = EXCLUDED.allowed;