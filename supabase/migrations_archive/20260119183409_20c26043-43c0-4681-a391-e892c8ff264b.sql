-- Drop the trigger that calls the broken function
DROP TRIGGER IF EXISTS tr_seed_organization_defaults ON public.organizations;

-- Recreate the seed_organization_defaults function WITHOUT pricing_profiles/service_pricing_rules references
-- These tables were dropped in a previous migration
CREATE OR REPLACE FUNCTION seed_organization_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default case services only (pricing_profiles and service_pricing_rules no longer exist)
  INSERT INTO public.case_services (organization_id, name, code, is_billable, is_active, display_order, track_duration)
  VALUES 
    (NEW.id, 'Surveillance', 'SURV', true, true, 1, true),
    (NEW.id, 'Background Check', 'BGCK', true, true, 2, true),
    (NEW.id, 'Interview', 'INTV', true, true, 3, true),
    (NEW.id, 'Consultation', 'CONS', true, true, 4, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger with the fixed function
CREATE TRIGGER tr_seed_organization_defaults
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_organization_defaults();

-- Also fix/drop the set_case_pricing_profile_from_account function since pricing_profiles is gone
DROP FUNCTION IF EXISTS set_case_pricing_profile_from_account() CASCADE;