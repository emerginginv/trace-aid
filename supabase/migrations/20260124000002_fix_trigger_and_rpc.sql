-- 1. Attach the trigger to auth.users
-- This was missing, which prevented organizations from being created on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- 2. Refine the resolution RPC to be more robust
-- We keep RETURNS TABLE to match the existing signature and avoid "cannot change return type" errors
-- But we ensure it returns a clean result set
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
    COALESCE(o.subscription_status = 'active', true) as is_active
  FROM public.organizations o
  WHERE o.subdomain = p_subdomain
  LIMIT 1;
END;
$$;

-- 3. Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.resolve_organization_by_subdomain(text) TO anon, authenticated;
