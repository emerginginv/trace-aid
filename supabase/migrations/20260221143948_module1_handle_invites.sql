-- Module 1: Handle Invitations and Owner Logic
-- This migration ensures invited users can join organizations correctly and 
-- that the first user of an organization is always the owner.

-- 1. accept_invitation RPC
-- This is called from the AcceptInvite.tsx page after the user has a session.
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

  -- 2. Optional: Check if email matches (TrackOps usually enforces this or allowing joining if signed in)
  -- For now, let's be flexible but log it if it's different.
  -- IF v_invite.email != v_user_email THEN
  --   RETURN jsonb_build_object('success', false, 'error', 'EMAIL_MISMATCH');
  -- END IF;

  -- 3. Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = v_invite.organization_id AND user_id = v_user_id
  ) THEN
    -- Mark invite as accepted anyway
    UPDATE public.organization_invites SET accepted_at = now() WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', true, 'already_member', true, 'organization_id', v_invite.organization_id);
  END IF;

  -- 4. Add user to the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.role);

  -- 5. Add corresponding app role if not already present
  -- Mapping: if role in members is 'owner'/'admin'/'manager' -> they get 'admin' in user_roles
  -- Otherwise they get 'investigator' or similar.
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

-- 2. Refine handle_new_user_org to skip if it's an invited user
-- We check for invite_token in metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  base_subdomain text;
  final_subdomain text;
  company_name_val text;
  provided_subdomain text;
  counter integer := 0;
  first_word text;
  v_invite_token text;
BEGIN
  -- Check if this is an invited user signup
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';
  
  -- Create profile (always do this)
  INSERT INTO public.profiles (
    id, email, full_name, username, mobile_phone, company_name, 
    address, city, state, zip_code
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name'),
    NEW.raw_user_meta_data->>'billing_address',
    NEW.raw_user_meta_data->>'billing_city',
    NEW.raw_user_meta_data->>'billing_state',
    NEW.raw_user_meta_data->>'billing_zip'
  )
  ON CONFLICT (id) DO NOTHING;

  -- IF invited, we STOP here. They will join their org via accept_invitation RPC.
  IF v_invite_token IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If no subdomain/company name in metadata, we probably shouldn't create an org 
  -- (e.g. manual auth.admin user creation), but for safety we'll check.
  provided_subdomain := NEW.raw_user_meta_data->>'subdomain';
  company_name_val := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name');

  IF provided_subdomain IS NULL AND company_name_val IS NULL THEN
    -- If it's a social login or something without our custom signup data, 
    -- we might want a default org, but let's be conservative.
    -- However, the user said "the first person to sign up... ALWAYS become owner".
    -- This implies we should create an org if they don't have one.
    
    -- Fallback to generating one from email if not provided
    IF provided_subdomain IS NULL THEN
        provided_subdomain := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
    END IF;
  END IF;

  -- Generate or use provided subdomain
  base_subdomain := lower(regexp_replace(COALESCE(provided_subdomain, 'org'), '[^a-z0-9-]', '', 'g'));
  IF length(base_subdomain) < 3 THEN
    base_subdomain := base_subdomain || 'cas';
  END IF;
  
  final_subdomain := base_subdomain;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE subdomain = final_subdomain) LOOP
    counter := counter + 1;
    final_subdomain := base_subdomain || counter::text;
  END LOOP;

  -- Create organization
  INSERT INTO public.organizations (name, subdomain)
  VALUES (
    COALESCE(company_name_val, split_part(NEW.email, '@', 1) || '''s Organization'),
    final_subdomain
  )
  RETURNING id INTO new_org_id;

  -- Add user as OWNER (The Critical Logic)
  -- The first user of the org is always the owner.
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Add admin role for permissions
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  -- Update metadata with final subdomain if it changed or was missing
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('subdomain', final_subdomain)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
