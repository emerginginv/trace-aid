-- Function to seed default pricing profile for new organizations
CREATE OR REPLACE FUNCTION public.seed_organization_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_surveillance_service_id UUID;
  v_background_service_id UUID;
  v_interview_service_id UUID;
  v_consultation_service_id UUID;
BEGIN
  -- Create default pricing profile
  INSERT INTO public.pricing_profiles (
    organization_id,
    name,
    description,
    is_default,
    is_active,
    created_by
  ) VALUES (
    NEW.id,
    'Standard Pricing',
    'Default pricing profile for all clients. Customize rates in Settings → Pricing Profiles.',
    true,
    true,
    NULL
  ) RETURNING id INTO v_profile_id;

  -- Create default case services
  INSERT INTO public.case_services (organization_id, name, code, is_billable, is_active, display_order, track_duration)
  VALUES 
    (NEW.id, 'Surveillance', 'SURV', true, true, 1, true),
    (NEW.id, 'Background Check', 'BGCK', true, true, 2, true),
    (NEW.id, 'Interview', 'INTV', true, true, 3, true),
    (NEW.id, 'Consultation', 'CONS', true, true, 4, true)
  ON CONFLICT DO NOTHING;

  -- Get service IDs for pricing rules
  SELECT id INTO v_surveillance_service_id FROM case_services 
    WHERE organization_id = NEW.id AND code = 'SURV' LIMIT 1;
  SELECT id INTO v_background_service_id FROM case_services 
    WHERE organization_id = NEW.id AND code = 'BGCK' LIMIT 1;
  SELECT id INTO v_interview_service_id FROM case_services 
    WHERE organization_id = NEW.id AND code = 'INTV' LIMIT 1;
  SELECT id INTO v_consultation_service_id FROM case_services 
    WHERE organization_id = NEW.id AND code = 'CONS' LIMIT 1;

  -- Create default pricing rules
  IF v_surveillance_service_id IS NOT NULL THEN
    INSERT INTO public.service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (
      v_profile_id, v_surveillance_service_id, NEW.id,
      'hourly', 75.00, true
    );
  END IF;

  IF v_background_service_id IS NOT NULL THEN
    INSERT INTO public.service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (
      v_profile_id, v_background_service_id, NEW.id,
      'flat_fee', 250.00, true
    );
  END IF;

  IF v_interview_service_id IS NOT NULL THEN
    INSERT INTO public.service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (
      v_profile_id, v_interview_service_id, NEW.id,
      'per_activity', 150.00, true
    );
  END IF;

  IF v_consultation_service_id IS NOT NULL THEN
    INSERT INTO public.service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (
      v_profile_id, v_consultation_service_id, NEW.id,
      'daily', 800.00, true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on organizations table
DROP TRIGGER IF EXISTS tr_seed_organization_defaults ON public.organizations;
CREATE TRIGGER tr_seed_organization_defaults
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_organization_defaults();

-- Prevent deletion of the default pricing profile
CREATE OR REPLACE FUNCTION public.prevent_default_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete the default pricing profile';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_default_profile_deletion ON public.pricing_profiles;
CREATE TRIGGER tr_prevent_default_profile_deletion
  BEFORE DELETE ON public.pricing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_default_profile_deletion();

-- Prevent deleting the last pricing rule from default profile
CREATE OR REPLACE FUNCTION public.prevent_last_default_rule_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_is_default BOOLEAN;
  v_rule_count INTEGER;
BEGIN
  SELECT pp.is_default INTO v_is_default
  FROM pricing_profiles pp
  WHERE pp.id = OLD.pricing_profile_id;

  IF v_is_default = true THEN
    SELECT COUNT(*) INTO v_rule_count
    FROM service_pricing_rules
    WHERE pricing_profile_id = OLD.pricing_profile_id
      AND id != OLD.id;

    IF v_rule_count < 1 THEN
      RAISE EXCEPTION 'Cannot delete the last pricing rule from the default profile';
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_last_default_rule_deletion ON public.service_pricing_rules;
CREATE TRIGGER tr_prevent_last_default_rule_deletion
  BEFORE DELETE ON public.service_pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_default_rule_deletion();

-- Seed default profile for existing organization if none exists
DO $$
DECLARE
  v_org_id UUID;
  v_has_default BOOLEAN;
  v_profile_id UUID;
BEGIN
  -- Get the first organization
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    -- Check if org already has a default profile
    SELECT EXISTS(
      SELECT 1 FROM pricing_profiles 
      WHERE organization_id = v_org_id AND is_default = true
    ) INTO v_has_default;

    -- If no default, mark the first profile as default
    IF NOT v_has_default THEN
      UPDATE pricing_profiles
      SET is_default = true
      WHERE id = (
        SELECT id FROM pricing_profiles 
        WHERE organization_id = v_org_id 
        ORDER BY created_at 
        LIMIT 1
      )
      RETURNING id INTO v_profile_id;
      
      -- If no profile exists, create one
      IF v_profile_id IS NULL THEN
        INSERT INTO pricing_profiles (
          organization_id, name, description, is_default, is_active
        ) VALUES (
          v_org_id, 'Standard Pricing', 
          'Default pricing profile for all clients.',
          true, true
        ) RETURNING id INTO v_profile_id;
      END IF;
    END IF;
  END IF;
END $$;