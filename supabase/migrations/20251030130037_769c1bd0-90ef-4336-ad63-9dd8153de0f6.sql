-- Drop the function with CASCADE to remove all dependent triggers
DROP FUNCTION IF EXISTS public.ensure_user_organization() CASCADE;

-- Recreate the function with better auth context handling
CREATE OR REPLACE FUNCTION public.ensure_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- If no authenticated user, skip (this can happen in background jobs or migrations)
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user has an organization
  SELECT organization_id INTO user_org_id
  FROM organization_members
  WHERE user_id = current_user_id
  LIMIT 1;

  -- If no organization, skip (user should have one from signup trigger)
  IF user_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Set the organization_id if it's NULL
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := user_org_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate all the triggers that were dropped
CREATE TRIGGER ensure_picklist_organization
  BEFORE INSERT ON picklists
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_case_organization
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_subject_organization
  BEFORE INSERT ON case_subjects
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_update_organization
  BEFORE INSERT ON case_updates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_activity_organization
  BEFORE INSERT ON case_activities
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_finance_organization
  BEFORE INSERT ON case_finances
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_attachment_organization
  BEFORE INSERT ON case_attachments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_subject_attachment_organization
  BEFORE INSERT ON subject_attachments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_retainer_organization
  BEFORE INSERT ON retainer_funds
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_invoice_organization
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_invoice_payment_organization
  BEFORE INSERT ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

CREATE TRIGGER ensure_org_settings_organization
  BEFORE INSERT ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization();

-- Now seed default case statuses for existing organizations
INSERT INTO picklists (type, value, display_order, is_active, user_id, organization_id, color, status_type)
SELECT 
  'case_status',
  status_value,
  display_order,
  true,
  om.user_id,
  om.organization_id,
  color_value,
  status_type_value
FROM (
  VALUES 
    ('open', 0, '#10b981', 'open'),
    ('active', 1, '#3b82f6', 'open'),
    ('on_hold', 2, '#f59e0b', 'open'),
    ('pending', 3, '#8b5cf6', 'open'),
    ('closed', 4, '#6b7280', 'closed'),
    ('cancelled', 5, '#ef4444', 'closed')
) AS defaults(status_value, display_order, color_value, status_type_value)
CROSS JOIN organization_members om
WHERE NOT EXISTS (
  SELECT 1 FROM picklists p 
  WHERE p.organization_id = om.organization_id 
  AND p.type = 'case_status'
)
ON CONFLICT DO NOTHING;