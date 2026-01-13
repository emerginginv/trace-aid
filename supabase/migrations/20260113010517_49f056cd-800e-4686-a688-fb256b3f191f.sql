-- ============================================
-- Enforcement Rules Migration for Case Services
-- ============================================

-- 1. Create trigger function to audit service status changes
CREATE OR REPLACE FUNCTION audit_service_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_events (
      organization_id,
      actor_user_id,
      action,
      metadata
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'SERVICE_STATUS_CHANGED',
      jsonb_build_object(
        'case_service_instance_id', NEW.id,
        'case_id', NEW.case_id,
        'case_service_id', NEW.case_service_id,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'reason', NEW.unscheduled_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger on case_service_instances
DROP TRIGGER IF EXISTS trg_audit_service_status ON case_service_instances;
CREATE TRIGGER trg_audit_service_status
  AFTER UPDATE ON case_service_instances
  FOR EACH ROW
  EXECUTE FUNCTION audit_service_status_changes();

-- 3. Create trigger function to enforce enterprise plan for activity_based schedule mode
CREATE OR REPLACE FUNCTION enforce_enterprise_schedule_mode()
RETURNS TRIGGER AS $$
DECLARE
  org_tier TEXT;
  org_product_id TEXT;
BEGIN
  IF NEW.schedule_mode = 'activity_based' THEN
    -- Get the organization's subscription tier and product id
    SELECT subscription_tier, subscription_product_id 
    INTO org_tier, org_product_id
    FROM organizations 
    WHERE id = NEW.organization_id;
    
    -- Check if organization has enterprise plan
    -- Enterprise detection based on tier name or specific product IDs
    IF NOT (
      LOWER(COALESCE(org_tier, '')) LIKE '%enterprise%' OR
      LOWER(COALESCE(org_tier, '')) LIKE '%unlimited%' OR
      org_product_id IN ('prod_enterprise', 'prod_unlimited')
    ) THEN
      RAISE EXCEPTION 'Activity-based scheduling requires an Enterprise plan. Please upgrade to unlock this feature.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger on case_services for enterprise enforcement
DROP TRIGGER IF EXISTS trg_enforce_enterprise_schedule ON case_services;
CREATE TRIGGER trg_enforce_enterprise_schedule
  BEFORE INSERT OR UPDATE OF schedule_mode ON case_services
  FOR EACH ROW
  EXECUTE FUNCTION enforce_enterprise_schedule_mode();

-- 5. Update RLS policies for case_services to be admin-only for modifications
-- First, drop existing modification policies
DROP POLICY IF EXISTS "Organization admins can create services" ON case_services;
DROP POLICY IF EXISTS "Organization admins can update services" ON case_services;
DROP POLICY IF EXISTS "Organization admins can delete services" ON case_services;
DROP POLICY IF EXISTS "Users can manage their org services" ON case_services;
DROP POLICY IF EXISTS "Org members can manage case services" ON case_services;

-- Create admin-only policies
CREATE POLICY "Admins can create services"
  ON case_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
        AND organization_id = case_services.organization_id 
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update services"
  ON case_services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
        AND organization_id = case_services.organization_id 
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete services"
  ON case_services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
        AND organization_id = case_services.organization_id 
        AND role = 'admin'
    )
  );

-- 6. Create a helper function to check if a service is available for a case type
CREATE OR REPLACE FUNCTION is_service_available_for_case_type(
  p_service_case_types TEXT[],
  p_case_type_tag TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If service has no case type restrictions (empty array), it's available for all
  IF p_service_case_types IS NULL OR array_length(p_service_case_types, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If case has no type tag, only unrestricted services are available
  IF p_case_type_tag IS NULL OR p_case_type_tag = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if the case type is in the service's allowed types
  RETURN p_case_type_tag = ANY(p_service_case_types);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Create a function to get available services for a case
CREATE OR REPLACE FUNCTION get_available_services_for_case(
  p_case_id UUID,
  p_organization_id UUID
)
RETURNS SETOF case_services AS $$
DECLARE
  v_case_type_tag TEXT;
BEGIN
  -- Get the case's type tag
  SELECT case_type_tag INTO v_case_type_tag
  FROM cases
  WHERE id = p_case_id AND organization_id = p_organization_id;
  
  -- Return services that match the case type
  RETURN QUERY
  SELECT cs.*
  FROM case_services cs
  WHERE cs.organization_id = p_organization_id
    AND cs.is_active = TRUE
    AND is_service_available_for_case_type(cs.case_types, v_case_type_tag)
  ORDER BY cs.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;