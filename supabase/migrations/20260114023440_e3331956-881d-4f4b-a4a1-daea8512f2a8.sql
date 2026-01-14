-- Enhance trigger to fallback to organization default pricing profile
CREATE OR REPLACE FUNCTION public.set_case_pricing_profile_from_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if pricing_profile_id is not already set
  IF NEW.pricing_profile_id IS NULL THEN
    -- First try: Get from account
    IF NEW.account_id IS NOT NULL THEN
      SELECT default_pricing_profile_id INTO NEW.pricing_profile_id
      FROM public.accounts
      WHERE id = NEW.account_id;
    END IF;
    
    -- Second try: Get organization default if still null
    IF NEW.pricing_profile_id IS NULL AND NEW.organization_id IS NOT NULL THEN
      SELECT id INTO NEW.pricing_profile_id
      FROM public.pricing_profiles
      WHERE organization_id = NEW.organization_id 
        AND is_default = true 
        AND is_active = true
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;