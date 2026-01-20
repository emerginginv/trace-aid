-- Fix the check_service_budget_before_activity trigger function to use valid violation_type values
CREATE OR REPLACE FUNCTION public.check_service_budget_before_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_consumption RECORD;
  v_case_org_id UUID;
BEGIN
  -- Get organization_id for the case
  SELECT organization_id INTO v_case_org_id FROM cases WHERE id = NEW.case_id;
  
  -- Get the budget configuration for the case
  SELECT * INTO v_budget FROM case_budgets WHERE case_id = NEW.case_id;
  
  -- If no budget exists, allow the activity
  IF v_budget IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get current consumption (using case_finances billing items)
  SELECT 
    COALESCE(SUM(hours), 0) as total_hours,
    COALESCE(SUM(amount), 0) as total_amount
  INTO v_consumption
  FROM case_finances 
  WHERE case_id = NEW.case_id 
    AND finance_type IN ('time', 'billing_item');
  
  -- Check if budget would be exceeded
  IF v_budget.hard_cap = true THEN
    -- For hard cap, check if we're already at or over the limit
    IF v_budget.total_budget_hours IS NOT NULL AND v_consumption.total_hours >= v_budget.total_budget_hours THEN
      -- Log violation with valid type 'blocked' instead of 'hard_cap_exceeded'
      INSERT INTO budget_violation_events (
        case_id, organization_id, user_id, violation_type, budget_scope,
        service_instance_id, hours_at_violation, amount_at_violation,
        hours_limit, amount_limit, action_attempted, action_blocked
      ) VALUES (
        NEW.case_id, v_case_org_id, NEW.user_id, 'blocked', 'case',
        NEW.case_service_instance_id, v_consumption.total_hours, v_consumption.total_amount,
        v_budget.total_budget_hours, v_budget.total_budget_amount, 'create_activity', true
      );
      
      RAISE EXCEPTION 'Budget hours limit exceeded. Hard cap is enabled.';
    END IF;
    
    IF v_budget.total_budget_amount IS NOT NULL AND v_consumption.total_amount >= v_budget.total_budget_amount THEN
      -- Log violation with valid type 'blocked'
      INSERT INTO budget_violation_events (
        case_id, organization_id, user_id, violation_type, budget_scope,
        service_instance_id, hours_at_violation, amount_at_violation,
        hours_limit, amount_limit, action_attempted, action_blocked
      ) VALUES (
        NEW.case_id, v_case_org_id, NEW.user_id, 'blocked', 'case',
        NEW.case_service_instance_id, v_consumption.total_hours, v_consumption.total_amount,
        v_budget.total_budget_hours, v_budget.total_budget_amount, 'create_activity', true
      );
      
      RAISE EXCEPTION 'Budget amount limit exceeded. Hard cap is enabled.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;