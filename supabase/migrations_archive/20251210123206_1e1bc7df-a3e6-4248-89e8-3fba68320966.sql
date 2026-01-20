-- Function to check if a user is an admin of any organization
CREATE OR REPLACE FUNCTION public.is_admin_of_any_org(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.role = 'admin'
  )
$$;

-- Update accept_organization_invite to reject if user is already an admin anywhere
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
  
  -- Check if user is already an admin of any organization
  -- Admins cannot join other organizations
  IF is_admin_of_any_org(current_user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You are already an admin of another organization. Admins cannot join additional organizations. Please use a different email to join this organization.'
    );
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