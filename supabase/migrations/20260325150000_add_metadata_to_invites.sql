-- Add metadata column to organization_invites to store full name and password
ALTER TABLE public.organization_invites 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update accept_invitation to use this metadata
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- 1. Find and validate the invitation
  SELECT * INTO v_invite 
  FROM public.organization_invites 
  WHERE token = p_token 
    AND (expires_at IS NULL OR expires_at > now())
    AND accepted_at IS NULL;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_INVITE');
  END IF;

  -- 2. Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = v_invite.organization_id AND user_id = v_user_id
  ) THEN
    -- Mark invite as accepted anyway
    UPDATE public.organization_invites SET accepted_at = now() WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', true, 'already_member', true, 'organization_id', v_invite.organization_id);
  END IF;

  -- 3. Create profile if it doesn't exist or replace empty name
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    v_user_id, 
    v_user_email, 
    COALESCE(v_invite.metadata->>'full_name', split_part(v_user_email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name
    WHERE profiles.full_name IS NULL OR profiles.full_name = '';

  -- 4. Add user to the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.role);

  -- 5. Add corresponding app role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    v_user_id, 
    CASE 
      WHEN v_invite.role IN ('owner', 'admin', 'manager') THEN 'admin'::app_role
      ELSE 'investigator'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 6. Mark invite as accepted
  UPDATE public.organization_invites 
  SET accepted_at = now() 
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true, 
    'organization_id', v_invite.organization_id, 
    'role', v_invite.role
  );
END;
$$;
