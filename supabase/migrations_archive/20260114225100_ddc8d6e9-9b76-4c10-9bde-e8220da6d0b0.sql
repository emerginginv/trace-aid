-- ═══════════════════════════════════════════════════════════════════════════════
-- BILLING ENFORCEMENT: update_id required, event activity_id blocked
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- RULES:
-- 1. All NEW billing items (finance_type = 'time' or 'billing_item') must include update_id
-- 2. Reject inserts where activity_id points to an event (activity_type = 'event')
-- 3. activity_id remains nullable for legacy reads
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create trigger function to enforce billing item rules
CREATE OR REPLACE FUNCTION public.enforce_billing_item_rules()
RETURNS TRIGGER AS $$
DECLARE
  activity_type_value TEXT;
BEGIN
  -- Only apply rules to billing-related finance types
  IF NEW.finance_type IN ('time', 'billing_item', 'expense') THEN
    
    -- RULE 1: New billing items must have update_id
    IF NEW.update_id IS NULL THEN
      RAISE EXCEPTION 'Billing items must be linked to an update (update_id is required). Create an update narrative first.';
    END IF;
    
    -- RULE 2: Reject if activity_id points to an event
    IF NEW.activity_id IS NOT NULL THEN
      SELECT activity_type INTO activity_type_value
      FROM public.case_activities
      WHERE id = NEW.activity_id;
      
      IF activity_type_value = 'event' THEN
        RAISE EXCEPTION 'Cannot create billing item directly from an event. Events must be billed through the Updates workflow.';
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger (drop if exists first to allow re-running)
DROP TRIGGER IF EXISTS enforce_billing_item_rules_trigger ON public.case_finances;

CREATE TRIGGER enforce_billing_item_rules_trigger
  BEFORE INSERT ON public.case_finances
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_billing_item_rules();

-- Add comment documenting the enforcement
COMMENT ON FUNCTION public.enforce_billing_item_rules() IS 
'Enforces billing item rules:
1. All new billing items (time/billing_item/expense) must include update_id
2. Rejects inserts where activity_id points to an event (events must go through Updates workflow)
3. Legacy records with NULL update_id are preserved for reads';

-- Add comment on column to document the constraint
COMMENT ON COLUMN public.case_finances.update_id IS 
'Required for all new billing items. Links billing to the case update narrative. Legacy records may be NULL.';