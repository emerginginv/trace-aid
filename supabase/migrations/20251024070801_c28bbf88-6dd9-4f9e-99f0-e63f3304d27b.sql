-- Add new role values to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'investigator';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token);

-- Create a function to accept invites
CREATE OR REPLACE FUNCTION public.accept_organization_invite(invite_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record organization_invites;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Get the invite
  SELECT * INTO invite_record
  FROM organization_invites
  WHERE token = invite_token
    AND accepted_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (invite_record.organization_id, current_user_id, invite_record.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Add role to user_roles
  INSERT INTO user_roles (user_id, role)
  VALUES (current_user_id, invite_record.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Mark invite as accepted
  UPDATE organization_invites
  SET accepted_at = now()
  WHERE token = invite_token;
  
  RETURN jsonb_build_object(
    'success', true, 
    'organization_id', invite_record.organization_id,
    'role', invite_record.role
  );
END;
$$;

-- Create a function to get organization users with their roles and status
CREATE OR REPLACE FUNCTION public.get_organization_users(org_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role app_role,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user is a member of this organization
  IF NOT is_org_member(auth.uid(), org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
  -- Active members
  SELECT 
    p.id,
    p.email,
    p.full_name,
    om.role,
    'active'::text as status,
    om.created_at
  FROM profiles p
  INNER JOIN organization_members om ON p.id = om.user_id
  WHERE om.organization_id = org_id
  
  UNION ALL
  
  -- Pending invites
  SELECT 
    oi.id,
    oi.email,
    NULL::text as full_name,
    oi.role,
    'pending'::text as status,
    oi.created_at
  FROM organization_invites oi
  WHERE oi.organization_id = org_id
    AND oi.accepted_at IS NULL
    AND oi.expires_at > now()
  
  ORDER BY created_at DESC;
END;
$$;