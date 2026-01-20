-- Fix the enforce_pricing_rules function to use the correct table name
CREATE OR REPLACE FUNCTION public.enforce_pricing_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_has_valid_rule BOOLEAN := false;
BEGIN
  -- Check if there's a valid pricing rule for this service
  SELECT EXISTS (
    SELECT 1 FROM service_pricing_rules spr
    WHERE spr.case_service_id = NEW.case_service_id
      AND spr.is_active = true
  ) INTO v_has_valid_rule;
  
  -- If billable but no pricing rule, log warning (don't block)
  IF NEW.billable = true AND NOT v_has_valid_rule THEN
    INSERT INTO enforcement_actions (
      case_id, organization_id, user_id, action_type, enforcement_type,
      was_blocked, block_reason, context
    ) VALUES (
      NEW.case_id, NEW.organization_id, COALESCE(NEW.created_by, auth.uid()),
      'service_create', 'pricing',
      false, 'No active pricing rule found for billable service',
      jsonb_build_object(
        'service_instance_id', NEW.id,
        'case_service_id', NEW.case_service_id,
        'billable', NEW.billable
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;