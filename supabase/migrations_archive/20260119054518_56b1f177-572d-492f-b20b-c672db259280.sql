-- Update get_user_organizations function to use caseinformation.app domain
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  subdomain text,
  logo_url text,
  is_current boolean,
  primary_domain text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.subdomain,
    o.logo_url,
    false AS is_current,
    COALESCE(
      (SELECT od.domain 
       FROM organization_domains od 
       WHERE od.organization_id = o.id 
       AND od.status = 'active' 
       LIMIT 1),
      o.subdomain || '.caseinformation.app'
    ) AS primary_domain
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = v_user_id
  AND o.is_active = true
  ORDER BY o.name;
END;
$$;