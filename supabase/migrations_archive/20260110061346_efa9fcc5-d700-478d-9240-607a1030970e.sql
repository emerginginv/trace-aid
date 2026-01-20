-- =============================================================================
-- Step 5: Organization Switching + User Invitations Enhancements
-- =============================================================================

-- Add revoked_at column to organization_invites for invite revocation
ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id);

-- Add function to get user's organizations with their primary domain
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(
  id uuid,
  name text,
  subdomain text,
  logo_url text,
  is_current boolean,
  primary_domain text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
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
      o.subdomain || '.casewyze.com'
    ) AS primary_domain
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = v_user_id
  AND o.is_active = true
  ORDER BY o.name;
END;
$$;

-- Create accept_invitation function for secure invite acceptance
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite RECORD;
  v_existing_member RECORD;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Find the invitation
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE token = p_token
  AND revoked_at IS NULL
  AND accepted_at IS NULL
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_INVITE');
  END IF;

  -- Verify email matches (case insensitive)
  IF lower(v_invite.email) != lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_MISMATCH');
  END IF;

  -- Check if already a member
  SELECT * INTO v_existing_member
  FROM organization_members
  WHERE organization_id = v_invite.organization_id
  AND user_id = v_user_id;

  IF FOUND THEN
    -- Already a member, mark invite as accepted anyway
    UPDATE organization_invites
    SET accepted_at = now()
    WHERE id = v_invite.id;
    
    RETURN jsonb_build_object('success', true, 'already_member', true, 'organization_id', v_invite.organization_id);
  END IF;

  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.role);

  -- Mark invitation as accepted
  UPDATE organization_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  -- Log audit event
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (
    v_invite.organization_id,
    v_user_id,
    'INVITE_ACCEPTED',
    jsonb_build_object(
      'email', v_user_email,
      'role', v_invite.role,
      'invite_id', v_invite.id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role
  );
END;
$$;

-- Create revoke_invitation function
CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVITE_NOT_FOUND');
  END IF;

  -- Check if user is admin of the organization
  IF NOT is_org_member(v_user_id, v_invite.organization_id) OR NOT has_role(v_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  -- Already revoked or accepted
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REVOKED');
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACCEPTED');
  END IF;

  -- Revoke the invitation
  UPDATE organization_invites
  SET revoked_at = now(), revoked_by = v_user_id
  WHERE id = p_invite_id;

  -- Log audit event
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (
    v_invite.organization_id,
    v_user_id,
    'INVITE_REVOKED',
    jsonb_build_object('email', v_invite.email, 'invite_id', p_invite_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create get_pending_invites function
CREATE OR REPLACE FUNCTION public.get_pending_invites(p_organization_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  expires_at timestamptz,
  invited_by_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify caller is member of the organization
  IF NOT is_org_member(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    oi.id,
    oi.email,
    oi.role::text,
    oi.created_at,
    oi.expires_at,
    p.full_name AS invited_by_name
  FROM organization_invites oi
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE oi.organization_id = p_organization_id
  AND oi.accepted_at IS NULL
  AND oi.revoked_at IS NULL
  AND oi.expires_at > now()
  ORDER BY oi.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_invites(uuid) TO authenticated;