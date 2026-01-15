-- Fix budget enforcement to allow non-service-linked activities when over budget
CREATE OR REPLACE FUNCTION public.enforce_budget_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_budget RECORD;
  v_consumption RECORD;
  v_new_hours NUMERIC;
  v_new_amount NUMERIC;
  v_would_exceed BOOLEAN := false;
  v_block_reason TEXT;
  v_case_org_id UUID;
  v_service_billable BOOLEAN;
BEGIN
  -- Skip enforcement for activities with no service linked (non-billable context)
  IF NEW.case_service_instance_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the linked service instance is billable
  SELECT billable INTO v_service_billable
  FROM case_service_instances
  WHERE id = NEW.case_service_instance_id;
  
  -- Skip enforcement for explicitly non-billable service instances
  IF v_service_billable = false THEN
    RETURN NEW;
  END IF;

  -- Only check on INSERT or if service instance changed on UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Skip if nothing budget-related changed
    IF OLD.case_service_instance_id IS NOT DISTINCT FROM NEW.case_service_instance_id THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Get case organization
  SELECT organization_id INTO v_case_org_id FROM cases WHERE id = NEW.case_id;
  
  -- Get case budget
  SELECT * INTO v_budget
  FROM case_budgets
  WHERE case_id = NEW.case_id;
  
  -- No budget = no enforcement
  IF v_budget IS NULL OR v_budget.hard_cap = false THEN
    RETURN NEW;
  END IF;
  
  -- Calculate current consumption
  SELECT 
    COALESCE(SUM(
      CASE WHEN cf.hours IS NOT NULL THEN cf.hours ELSE 0 END
    ), 0) as total_hours,
    COALESCE(SUM(cf.amount), 0) as total_amount
  INTO v_consumption
  FROM case_finances cf
  WHERE cf.case_id = NEW.case_id
    AND cf.finance_type IN ('time', 'expense');
  
  -- Check hours limit
  IF v_budget.total_budget_hours IS NOT NULL THEN
    IF v_consumption.total_hours >= v_budget.total_budget_hours THEN
      v_would_exceed := true;
      v_block_reason := format('Hours budget exceeded: %s of %s hours used', 
        v_consumption.total_hours, v_budget.total_budget_hours);
    END IF;
  END IF;
  
  -- Check amount limit
  IF v_budget.total_budget_amount IS NOT NULL AND NOT v_would_exceed THEN
    IF v_consumption.total_amount >= v_budget.total_budget_amount THEN
      v_would_exceed := true;
      v_block_reason := format('Dollar budget exceeded: $%s of $%s used', 
        v_consumption.total_amount, v_budget.total_budget_amount);
    END IF;
  END IF;
  
  -- If would exceed with hard cap, block and log
  IF v_would_exceed THEN
    -- Log the enforcement action
    INSERT INTO enforcement_actions (
      case_id, organization_id, user_id, action_type, enforcement_type,
      was_blocked, block_reason, context
    ) VALUES (
      NEW.case_id, v_case_org_id, NEW.user_id, 'activity_create', 'budget',
      true, v_block_reason,
      jsonb_build_object(
        'activity_type', NEW.activity_type,
        'title', NEW.title,
        'hard_cap', v_budget.hard_cap
      )
    );
    
    -- Log budget violation
    INSERT INTO budget_violation_events (
      case_id, organization_id, user_id, violation_type, budget_scope,
      service_instance_id, hours_at_violation, amount_at_violation,
      hours_limit, amount_limit, action_attempted, action_blocked
    ) VALUES (
      NEW.case_id, v_case_org_id, NEW.user_id, 'blocked', 'case',
      NEW.case_service_instance_id, v_consumption.total_hours, v_consumption.total_amount,
      v_budget.total_budget_hours, v_budget.total_budget_amount, 'create_activity', true
    );
    
    RAISE EXCEPTION 'Budget exceeded: This case has a hard budget cap that has been reached. %', v_block_reason;
  END IF;
  
  RETURN NEW;
END;
$function$;