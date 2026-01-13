-- ============================================
-- SYSTEM PROMPT 2: Enforce Case Services Principles
-- Services define work, not pricing
-- ============================================

-- Add comments to clarify the purpose of case_services table
COMMENT ON TABLE public.case_services IS 'Global case service definitions representing types of work performed on cases. Services define WORK, not pricing. Pricing is handled in service_pricing_rules.';

-- Mark legacy pricing fields as deprecated with comments
COMMENT ON COLUMN public.case_services.default_rate IS 'DEPRECATED: Use service_pricing_rules for pricing. This field exists for backwards compatibility only.';
COMMENT ON COLUMN public.case_services.billing_code IS 'Optional billing code for reporting. Actual pricing is in service_pricing_rules.';
COMMENT ON COLUMN public.case_services.billing_description_template IS 'Template for invoice line item descriptions. Does not define pricing.';
COMMENT ON COLUMN public.case_services.is_billable IS 'Whether this service is typically billable. Can be overridden in service_pricing_rules.';

-- Ensure schedule_mode has proper values
-- Check existing values and add constraint if not already present
DO $$
BEGIN
  -- Add CHECK constraint for schedule_mode if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'case_services_schedule_mode_check'
  ) THEN
    -- First update any invalid values to 'none'
    UPDATE public.case_services 
    SET schedule_mode = 'none' 
    WHERE schedule_mode NOT IN ('none', 'primary_investigator', 'activity_based');
    
    -- Then add the constraint
    ALTER TABLE public.case_services
    ADD CONSTRAINT case_services_schedule_mode_check 
    CHECK (schedule_mode IN ('none', 'primary_investigator', 'activity_based'));
  END IF;
END $$;

-- Document the schedule_mode options
COMMENT ON COLUMN public.case_services.schedule_mode IS 'How this service is scheduled: none (manual only), primary_investigator (auto-assign to case PI), activity_based (create activities)';

-- Document case_types field
COMMENT ON COLUMN public.case_services.case_types IS 'Array of case type tags this service is available for. NULL means available for all case types.';