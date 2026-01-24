-- Add missing RPC functions for tenant resolution and platform roles
-- This fixes 404 errors when visiting subdomains

-- 1. resolve_organization_by_subdomain
-- Returns basic organization info needed for tenant-aware routing
CREATE OR REPLACE FUNCTION public.resolve_organization_by_subdomain(p_subdomain text)
RETURNS TABLE (
  organization_id uuid,
  name text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id, 
    o.name, 
    COALESCE(o.subscription_status = 'active', true) as is_active -- Use subscription_status or default to active
  FROM public.organizations o
  WHERE o.subdomain = p_subdomain;
END;
$$;

-- 2. get_platform_role
-- Returns a string role if the user is platform staff (e.g. system_admin)
CREATE OR REPLACE FUNCTION public.get_platform_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has platform staff role or admin role in a specific management org
  -- For now, returning 'admin' if they have a role in user_roles
  RETURN (
    SELECT role::text 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
    LIMIT 1
  );
END;
$$;

-- 3. resolve_tenant_by_domain
-- For custom domain resolution
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_domain(p_hostname text)
RETURNS TABLE (
  found boolean,
  organization_id uuid,
  subdomain text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as found,
    o.id as organization_id,
    o.subdomain
  FROM public.organizations o
  WHERE o.custom_domain = p_hostname
  LIMIT 1;
END;
$$;

-- 4. Impersonation stubs (needed for ImpersonationContext)
CREATE OR REPLACE FUNCTION public.get_active_impersonation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('active', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.start_impersonation(p_target_user_id uuid, p_target_org_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('success', false, 'error', 'Impersonation not fully implemented in this environment');
END;
$$;

CREATE OR REPLACE FUNCTION public.end_impersonation(p_session_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.resolve_organization_by_subdomain(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_domain(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_impersonation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_impersonation(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_impersonation(text) TO authenticated;
