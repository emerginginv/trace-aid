-- Fix: Update enterprise detection to use actual Stripe product ID
-- The Enterprise plan product ID: prod_Tm0eUMnuJ4978P

CREATE OR REPLACE FUNCTION enforce_enterprise_schedule_mode()
RETURNS TRIGGER AS $$
DECLARE
  org_tier TEXT;
  org_product_id TEXT;
BEGIN
  IF NEW.schedule_mode = 'activity_based' THEN
    SELECT subscription_tier, subscription_product_id 
    INTO org_tier, org_product_id
    FROM organizations 
    WHERE id = NEW.organization_id;
    
    -- Check if organization has enterprise plan using ACTUAL Stripe product IDs
    -- prod_Tm0eUMnuJ4978P = The Enterprise ($69/month)
    IF NOT (
      LOWER(COALESCE(org_tier, '')) LIKE '%enterprise%' OR
      LOWER(COALESCE(org_tier, '')) LIKE '%unlimited%' OR
      org_product_id = 'prod_Tm0eUMnuJ4978P'  -- The Enterprise
    ) THEN
      RAISE EXCEPTION 'Activity-based scheduling requires an Enterprise plan. Please upgrade to unlock this feature.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;