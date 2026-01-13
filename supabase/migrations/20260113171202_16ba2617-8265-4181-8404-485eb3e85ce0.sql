-- Modify the existing log_case_budget_change function to check for auth.uid() before logging
CREATE OR REPLACE FUNCTION public.log_case_budget_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if this update is from the case_budgets sync (session var check)
  IF current_setting('session.sync_from_case_budgets', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Only log if budget_hours changed and there's an authenticated user
  IF OLD.budget_hours IS DISTINCT FROM NEW.budget_hours AND auth.uid() IS NOT NULL THEN
    INSERT INTO case_budget_adjustments (
      case_id, user_id, organization_id, 
      adjustment_type, previous_value, new_value, reason
    ) VALUES (
      NEW.id, auth.uid(), NEW.organization_id,
      'hours', OLD.budget_hours, NEW.budget_hours,
      COALESCE(NEW.budget_notes, 'Budget hours updated')
    );
  END IF;
  
  -- Only log if budget_dollars changed and there's an authenticated user
  IF OLD.budget_dollars IS DISTINCT FROM NEW.budget_dollars AND auth.uid() IS NOT NULL THEN
    INSERT INTO case_budget_adjustments (
      case_id, user_id, organization_id, 
      adjustment_type, previous_value, new_value, reason
    ) VALUES (
      NEW.id, auth.uid(), NEW.organization_id,
      'money', OLD.budget_dollars, NEW.budget_dollars,
      COALESCE(NEW.budget_notes, 'Budget dollars updated')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to sync case_budgets to cases table
CREATE OR REPLACE FUNCTION public.sync_case_budget_to_cases()
RETURNS TRIGGER AS $$
BEGIN
  -- Set session variable to skip logging trigger
  PERFORM set_config('session.sync_from_case_budgets', 'true', true);
  
  UPDATE cases
  SET 
    budget_hours = NEW.total_budget_hours,
    budget_dollars = NEW.total_budget_amount
  WHERE id = NEW.case_id;
  
  PERFORM set_config('session.sync_from_case_budgets', 'false', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to sync on insert or update
DROP TRIGGER IF EXISTS trg_sync_case_budget ON case_budgets;
CREATE TRIGGER trg_sync_case_budget
AFTER INSERT OR UPDATE ON case_budgets
FOR EACH ROW
EXECUTE FUNCTION sync_case_budget_to_cases();