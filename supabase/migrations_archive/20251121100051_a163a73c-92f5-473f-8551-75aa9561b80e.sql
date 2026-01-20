
-- Drop and recreate the get_organization_users function with better filtering
DROP FUNCTION IF EXISTS public.get_organization_users(uuid);

CREATE OR REPLACE FUNCTION public.get_organization_users(org_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role app_role,
  status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user is actually a member of this specific organization
  IF NOT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to view users for this organization';
  END IF;

  -- Return only active members from THIS specific organization
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    om.role,
    'active'::text as status,
    om.created_at
  FROM public.profiles p
  INNER JOIN public.organization_members om ON p.id = om.user_id
  WHERE om.organization_id = org_id  -- CRITICAL: Filter by the specific org
  
  UNION ALL
  
  -- Return only pending invites from THIS specific organization
  SELECT 
    oi.id,
    oi.email,
    NULL::text as full_name,
    oi.role,
    'pending'::text as status,
    oi.created_at
  FROM public.organization_invites oi
  WHERE oi.organization_id = org_id  -- CRITICAL: Filter by the specific org
    AND oi.accepted_at IS NULL
    AND oi.expires_at > now()
  
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_organization_users(uuid) TO authenticated;
