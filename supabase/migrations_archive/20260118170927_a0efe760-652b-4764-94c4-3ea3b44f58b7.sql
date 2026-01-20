-- Improve security of is_vendor_case_accessible function
-- SECURITY DEFINER is required due to circular RLS dependency, but we add validation

CREATE OR REPLACE FUNCTION public.is_vendor_case_accessible(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_vendor boolean;
BEGIN
  -- SECURITY CHECK 1: Validate inputs are not null
  IF _user_id IS NULL OR _case_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- SECURITY CHECK 2: Verify the user_id matches the authenticated user
  -- This prevents privilege escalation by passing someone else's user_id
  IF _user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- SECURITY CHECK 3: Verify the caller actually has the vendor role
  -- This function should only return true for actual vendors
  SELECT EXISTS(
    SELECT 1 FROM organization_members om
    WHERE om.user_id = _user_id 
    AND om.role = 'vendor'::app_role
  ) INTO v_is_vendor;
  
  IF NOT v_is_vendor THEN
    -- If not a vendor, they should use other access methods (org member policies)
    RETURN FALSE;
  END IF;

  -- CORE LOGIC: Vendors can access cases where they:
  -- 1. Created the case (unlikely but possible in some workflows)
  -- 2. Posted an update to the case
  -- 3. Have an assigned activity on the case
  -- 4. Are linked via vendor_contacts -> case_vendors relationship
  RETURN EXISTS (
    SELECT 1 FROM cases WHERE id = _case_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM case_updates WHERE case_id = _case_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM case_activities WHERE case_id = _case_id AND assigned_user_id = _user_id
  ) OR EXISTS (
    -- Check vendor assignment through case_vendors table
    SELECT 1 
    FROM case_vendors cv
    JOIN vendors v ON v.id = cv.vendor_id
    JOIN vendor_contacts vc ON vc.vendor_id = v.id
    WHERE cv.case_id = _case_id 
    AND vc.user_id = _user_id
  );
END;
$$;

-- Add a comment explaining why SECURITY DEFINER is required
COMMENT ON FUNCTION public.is_vendor_case_accessible(_user_id uuid, _case_id uuid) IS 
'Checks if a vendor user has access to a specific case. Uses SECURITY DEFINER because 
the cases table RLS policy calls this function, creating a circular dependency. 
Security is maintained by: (1) validating _user_id matches auth.uid(), 
(2) verifying the caller has vendor role, (3) only checking legitimate access paths.';