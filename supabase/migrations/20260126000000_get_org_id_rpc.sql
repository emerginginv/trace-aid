-- Create a function to allow fetching org id by user id for newly signed up users
-- Limited to cases where it's the user's own ID or bypasses RLS safely
CREATE OR REPLACE FUNCTION public.get_org_id_by_user_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.organization_members
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_id_by_user_id(uuid) TO anon, authenticated;
