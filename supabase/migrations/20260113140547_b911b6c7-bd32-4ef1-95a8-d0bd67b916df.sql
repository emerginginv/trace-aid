-- Create case_service_budget_limits table for per-service budget caps
CREATE TABLE public.case_service_budget_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_service_instance_id UUID NOT NULL REFERENCES public.case_service_instances(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  max_hours NUMERIC(10, 2) NULL,
  max_amount NUMERIC(12, 2) NULL,
  warning_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80 CHECK (warning_threshold >= 0 AND warning_threshold <= 100),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT NULL,
  -- Ensure only one limit per service instance
  CONSTRAINT case_service_budget_limits_unique UNIQUE (case_service_instance_id),
  -- Ensure at least one limit is set
  CONSTRAINT case_service_budget_limits_has_limit CHECK (max_hours IS NOT NULL OR max_amount IS NOT NULL)
);

-- Add indexes
CREATE INDEX idx_case_service_budget_limits_case_id ON public.case_service_budget_limits(case_id);
CREATE INDEX idx_case_service_budget_limits_instance_id ON public.case_service_budget_limits(case_service_instance_id);
CREATE INDEX idx_case_service_budget_limits_org_id ON public.case_service_budget_limits(organization_id);

-- Enable RLS
ALTER TABLE public.case_service_budget_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view service budget limits in their organization"
ON public.case_service_budget_limits
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and managers can create service budget limits"
ON public.case_service_budget_limits
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_permission(auth.uid(), 'modify_case_budget'))
);

CREATE POLICY "Admins and managers can update service budget limits"
ON public.case_service_budget_limits
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_permission(auth.uid(), 'modify_case_budget'))
);

CREATE POLICY "Admins can delete service budget limits"
ON public.case_service_budget_limits
FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_case_service_budget_limits_updated_at
BEFORE UPDATE ON public.case_service_budget_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_case_budgets_updated_at();

-- Function to get service-level budget consumption
CREATE OR REPLACE FUNCTION public.get_service_budget_status(
  p_case_service_instance_id UUID
)
RETURNS TABLE (
  instance_id UUID,
  service_name TEXT,
  max_hours NUMERIC,
  max_amount NUMERIC,
  warning_threshold NUMERIC,
  hours_consumed NUMERIC,
  amount_consumed NUMERIC,
  hours_utilization_pct NUMERIC,
  amount_utilization_pct NUMERIC,
  hours_remaining NUMERIC,
  amount_remaining NUMERIC,
  is_hours_warning BOOLEAN,
  is_amount_warning BOOLEAN,
  is_hours_exceeded BOOLEAN,
  is_amount_exceeded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
  v_hours_consumed NUMERIC := 0;
  v_amount_consumed NUMERIC := 0;
  v_hours_pct NUMERIC := 0;
  v_amount_pct NUMERIC := 0;
BEGIN
  -- Get the budget limit for this service instance
  SELECT csbl.*, cs.name as service_name
  INTO v_limit
  FROM case_service_budget_limits csbl
  JOIN case_service_instances csi ON csi.id = csbl.case_service_instance_id
  JOIN case_services cs ON cs.id = csi.case_service_id
  WHERE csbl.case_service_instance_id = p_case_service_instance_id;
  
  IF v_limit IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate consumed hours from activities linked to this service instance
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN ca.activity_type IN ('surveillance', 'interview', 'research', 'travel', 'fieldwork', 'meeting')
        THEN EXTRACT(EPOCH FROM (
          COALESCE(ca.completed_at, now()) - ca.created_at
        )) / 3600.0
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN cf.finance_type = 'expense' THEN cf.amount
        ELSE 0
      END
    ), 0)
  INTO v_hours_consumed, v_amount_consumed
  FROM case_activities ca
  LEFT JOIN case_finances cf ON cf.activity_id = ca.id
  WHERE ca.case_service_instance_id = p_case_service_instance_id;
  
  -- Also get hours from service instance quantity_actual
  SELECT COALESCE(csi.quantity_actual, 0) INTO v_hours_consumed
  FROM case_service_instances csi
  WHERE csi.id = p_case_service_instance_id;
  
  -- Calculate utilization percentages
  IF v_limit.max_hours IS NOT NULL AND v_limit.max_hours > 0 THEN
    v_hours_pct := ROUND((v_hours_consumed / v_limit.max_hours) * 100, 1);
  END IF;
  
  IF v_limit.max_amount IS NOT NULL AND v_limit.max_amount > 0 THEN
    v_amount_pct := ROUND((v_amount_consumed / v_limit.max_amount) * 100, 1);
  END IF;
  
  RETURN QUERY SELECT
    p_case_service_instance_id,
    v_limit.service_name,
    v_limit.max_hours,
    v_limit.max_amount,
    v_limit.warning_threshold,
    v_hours_consumed,
    v_amount_consumed,
    v_hours_pct,
    v_amount_pct,
    COALESCE(v_limit.max_hours, 0) - v_hours_consumed,
    COALESCE(v_limit.max_amount, 0) - v_amount_consumed,
    v_hours_pct >= v_limit.warning_threshold AND v_hours_pct < 100,
    v_amount_pct >= v_limit.warning_threshold AND v_amount_pct < 100,
    v_hours_pct >= 100,
    v_amount_pct >= 100;
END;
$$;

-- Function to check service budget before activity save
CREATE OR REPLACE FUNCTION public.check_service_budget_before_activity(
  p_case_service_instance_id UUID,
  p_additional_hours NUMERIC DEFAULT 0,
  p_additional_amount NUMERIC DEFAULT 0
)
RETURNS TABLE (
  can_proceed BOOLEAN,
  warning_message TEXT,
  service_name TEXT,
  hours_remaining NUMERIC,
  amount_remaining NUMERIC,
  would_exceed_hours BOOLEAN,
  would_exceed_amount BOOLEAN,
  has_case_hard_cap BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_case_id UUID;
  v_case_budget RECORD;
  v_warning TEXT := NULL;
  v_can_proceed BOOLEAN := true;
  v_would_exceed_hours BOOLEAN := false;
  v_would_exceed_amount BOOLEAN := false;
BEGIN
  -- Get the case_id for this service instance
  SELECT csi.case_id INTO v_case_id
  FROM case_service_instances csi
  WHERE csi.id = p_case_service_instance_id;
  
  -- Get the case-level budget (for hard cap check)
  SELECT cb.hard_cap INTO v_case_budget
  FROM case_budgets cb
  WHERE cb.case_id = v_case_id;
  
  -- Get service budget status
  SELECT * INTO v_status
  FROM get_service_budget_status(p_case_service_instance_id);
  
  -- If no service-level limit, just check case-level
  IF v_status IS NULL THEN
    -- Check case-level budget
    RETURN QUERY
    SELECT 
      r.can_proceed,
      r.warning_message,
      NULL::TEXT,
      r.hours_remaining,
      r.amount_remaining,
      r.would_exceed_hours,
      r.would_exceed_amount,
      r.hard_cap
    FROM check_budget_cap(v_case_id, p_additional_hours, p_additional_amount) r;
    RETURN;
  END IF;
  
  -- Check if additional work would exceed service limits
  IF v_status.max_hours IS NOT NULL THEN
    v_would_exceed_hours := (v_status.hours_remaining - p_additional_hours) < 0;
  END IF;
  
  IF v_status.max_amount IS NOT NULL THEN
    v_would_exceed_amount := (v_status.amount_remaining - p_additional_amount) < 0;
  END IF;
  
  -- Generate warning/blocking message
  IF v_would_exceed_hours OR v_would_exceed_amount THEN
    IF COALESCE(v_case_budget.hard_cap, false) THEN
      v_can_proceed := false;
      v_warning := 'Service budget limit reached. Case has a hard cap - cannot proceed.';
    ELSE
      v_warning := 'Warning: This will exceed the service budget limit for ' || v_status.service_name || '.';
    END IF;
  ELSIF v_status.is_hours_warning OR v_status.is_amount_warning THEN
    v_warning := 'Approaching service budget limit for ' || v_status.service_name || '.';
  END IF;
  
  RETURN QUERY SELECT 
    v_can_proceed,
    v_warning,
    v_status.service_name,
    v_status.hours_remaining,
    v_status.amount_remaining,
    v_would_exceed_hours,
    v_would_exceed_amount,
    COALESCE(v_case_budget.hard_cap, false);
END;
$$;