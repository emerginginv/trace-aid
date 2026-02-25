-- Migration to add RPC functions for user management

-- 1. get_organization_users
CREATE OR REPLACE FUNCTION public.get_organization_users(org_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    role public.app_role,
    status text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        om.role,
        'active'::text AS status,
        om.created_at
    FROM 
        public.profiles p
    JOIN 
        public.organization_members om ON p.id = om.user_id
    WHERE 
        om.organization_id = org_id;
END;
$$;

-- 2. get_pending_invites
CREATE OR REPLACE FUNCTION public.get_pending_invites(p_organization_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    role public.app_role,
    invited_by_name text,
    expires_at timestamptz,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.id,
        oi.email,
        oi.role,
        COALESCE(p.full_name, p.email, 'Unknown User') AS invited_by_name,
        oi.expires_at,
        oi.created_at
    FROM 
        public.organization_invites oi
    LEFT JOIN 
        public.profiles p ON oi.invited_by = p.id
    WHERE 
        oi.organization_id = p_organization_id
        AND oi.accepted_at IS NULL;
END;
$$;
