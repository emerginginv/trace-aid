-- Module 1: Owner Role Hierarchy and Permissions
-- This migration ensures that the 'owner' role is recognized as the highest role 
-- in the hierarchy, with all administrative permissions and access to settings.

-- 1. Update is_admin_or_manager to include 'owner'
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = p_user_id 
      AND role IN ('admin', 'manager', 'owner')
  );
$$;

-- 2. Update is_admin_of_any_org to include 'owner'
CREATE OR REPLACE FUNCTION public.is_admin_of_any_org(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.role IN ('admin', 'owner')
  );
$$;

-- 3. Update has_permission to bypass checks for 'owner' and 'admin' 
-- (TrackOps owners/admins generally have all permissions within their org)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Get the user's highest role in their primary organization
  -- (If they have multiple, we check the first one created for now, 
  -- but ideally this would be context-aware).
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- Owners and Admins always have permission
  IF v_role IN ('owner', 'admin') THEN
    RETURN true;
  END IF;

  -- Otherwise check the permissions table
  RETURN EXISTS (
    SELECT 1
    FROM public.permissions p
    WHERE p.role = v_role
      AND p.feature_key = _feature_key
      AND p.allowed = true
  );
END;
$$;

-- 4. Create a specific is_owner function for consistency
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'owner'
  );
$$;

-- 5. Ensure any existing owners have the 'admin' app role as well
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'admin'::app_role
FROM public.organization_members
WHERE role = 'owner'
ON CONFLICT (user_id, role) DO NOTHING;
