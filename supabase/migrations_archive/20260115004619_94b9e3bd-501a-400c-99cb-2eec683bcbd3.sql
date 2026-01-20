-- Fix log_budget_adjustment trigger to use 'dollars' instead of 'money'
CREATE OR REPLACE FUNCTION public.log_budget_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
  -- FIX: Use 'dollars' instead of 'money' to match check constraint
  IF OLD.budget_dollars IS DISTINCT FROM NEW.budget_dollars AND auth.uid() IS NOT NULL THEN
    INSERT INTO case_budget_adjustments (
      case_id, user_id, organization_id, 
      adjustment_type, previous_value, new_value, reason
    ) VALUES (
      NEW.id, auth.uid(), NEW.organization_id,
      'dollars', OLD.budget_dollars, NEW.budget_dollars,
      COALESCE(NEW.budget_notes, 'Budget dollars updated')
    );
  END IF;
  
  RETURN NEW;
END;
$$;