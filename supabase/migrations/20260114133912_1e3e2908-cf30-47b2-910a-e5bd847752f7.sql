-- Fix search_path for the new functions
CREATE OR REPLACE FUNCTION public.prevent_default_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete the default pricing profile';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_last_default_rule_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_is_default BOOLEAN;
  v_rule_count INTEGER;
BEGIN
  SELECT pp.is_default INTO v_is_default
  FROM public.pricing_profiles pp
  WHERE pp.id = OLD.pricing_profile_id;

  IF v_is_default = true THEN
    SELECT COUNT(*) INTO v_rule_count
    FROM public.service_pricing_rules
    WHERE pricing_profile_id = OLD.pricing_profile_id
      AND id != OLD.id;

    IF v_rule_count < 1 THEN
      RAISE EXCEPTION 'Cannot delete the last pricing rule from the default profile';
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;