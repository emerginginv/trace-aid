-- Fix the resolution RPC by dropping and recreating to support the new return type
DROP FUNCTION IF EXISTS public.resolve_organization_by_subdomain(text);

CREATE OR REPLACE FUNCTION public.resolve_organization_by_subdomain(p_subdomain text)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  subdomain text,
  logo_url text,
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
    o.name as organization_name,
    o.subdomain,
    o.logo_url,
    o.is_active
  FROM public.organizations o
  WHERE o.subdomain = p_subdomain
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_organization_by_subdomain(text) TO anon, authenticated;
