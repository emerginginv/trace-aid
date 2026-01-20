-- One-time seed for existing organization
DO $$
DECLARE
  v_org_id UUID := 'd76c9a66-790e-445a-a090-817229943cf5';
  v_profile_id UUID;
  v_surveillance_id UUID;
  v_background_id UUID;
  v_interview_id UUID;
  v_consultation_id UUID;
BEGIN
  -- Step 1: Create missing case services (Interview, Consultation)
  -- These are regular services - users can edit them
  INSERT INTO case_services (organization_id, name, code, is_billable, is_active, display_order, track_duration)
  VALUES 
    (v_org_id, 'Interview', 'INTV', true, true, 3, true),
    (v_org_id, 'Consultation', 'CONS', true, true, 4, true)
  ON CONFLICT DO NOTHING;

  -- Update existing services to have codes if missing
  UPDATE case_services SET code = 'SURV' 
  WHERE organization_id = v_org_id AND name = 'Surveillance' AND code IS NULL;

  -- Step 2: Create the default pricing profile
  INSERT INTO pricing_profiles (
    organization_id, name, description, is_default, is_active
  ) VALUES (
    v_org_id,
    'Standard Pricing',
    'Default pricing profile for all clients. Customize rates in Settings → Pricing Profiles.',
    true,
    true
  ) RETURNING id INTO v_profile_id;

  -- Step 3: Get service IDs
  SELECT id INTO v_surveillance_id FROM case_services 
    WHERE organization_id = v_org_id AND name = 'Surveillance' LIMIT 1;
  SELECT id INTO v_background_id FROM case_services 
    WHERE organization_id = v_org_id AND name = 'Background Check' LIMIT 1;
  SELECT id INTO v_interview_id FROM case_services 
    WHERE organization_id = v_org_id AND name = 'Interview' LIMIT 1;
  SELECT id INTO v_consultation_id FROM case_services 
    WHERE organization_id = v_org_id AND name = 'Consultation' LIMIT 1;

  -- Step 4: Create pricing rules for the default profile
  IF v_surveillance_id IS NOT NULL THEN
    INSERT INTO service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (v_profile_id, v_surveillance_id, v_org_id, 'hourly', 75.00, true);
  END IF;

  IF v_background_id IS NOT NULL THEN
    INSERT INTO service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (v_profile_id, v_background_id, v_org_id, 'flat_fee', 250.00, true);
  END IF;

  IF v_interview_id IS NOT NULL THEN
    INSERT INTO service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (v_profile_id, v_interview_id, v_org_id, 'per_activity', 150.00, true);
  END IF;

  IF v_consultation_id IS NOT NULL THEN
    INSERT INTO service_pricing_rules (
      pricing_profile_id, case_service_id, organization_id,
      pricing_model, rate, is_billable
    ) VALUES (v_profile_id, v_consultation_id, v_org_id, 'daily', 800.00, true);
  END IF;
END $$;