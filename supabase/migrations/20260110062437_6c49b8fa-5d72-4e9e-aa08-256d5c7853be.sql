-- =====================================================
-- Step 7: Audited Support Impersonation
-- =====================================================

-- 1. Create platform_users table for CaseWyze staff (separate from tenant tables)
CREATE TABLE IF NOT EXISTS public.platform_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_role text NOT NULL CHECK (platform_role IN ('platform_admin', 'platform_support')),
  email text NOT NULL,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- RLS for platform_users - only platform admins can manage
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;

-- Platform users can view themselves
CREATE POLICY "Platform users can view themselves"
ON public.platform_users
FOR SELECT
USING (user_id = auth.uid());

-- Service role manages platform users
CREATE POLICY "Service role manages platform users"
ON public.platform_users
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. Create impersonation_sessions table
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who is impersonating
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Who is being impersonated
  target_user_id uuid NOT NULL,
  target_user_email text NOT NULL,
  target_user_name text,
  
  -- Target organization
  target_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_organization_name text NOT NULL,
  
  -- Session metadata
  reason text NOT NULL, -- Mandatory reason for impersonation
  session_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  
  -- Time bounds
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  ended_at timestamptz,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for impersonation_sessions
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only the actor can view their own sessions
CREATE POLICY "Actors can view their impersonation sessions"
ON public.impersonation_sessions
FOR SELECT
USING (actor_user_id = auth.uid());

-- Service role manages sessions
CREATE POLICY "Service role manages impersonation sessions"
ON public.impersonation_sessions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_actor ON public.impersonation_sessions(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_token ON public.impersonation_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_status ON public.impersonation_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_platform_users_user_id ON public.platform_users(user_id);

-- 4. Create function to check if user is platform staff
CREATE OR REPLACE FUNCTION public.is_platform_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_users
    WHERE user_id = p_user_id
    AND is_active = true
  );
END;
$$;

-- 5. Create function to get platform role
CREATE OR REPLACE FUNCTION public.get_platform_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT platform_role INTO v_role
  FROM platform_users
  WHERE user_id = p_user_id
  AND is_active = true;
  
  RETURN v_role;
END;
$$;

-- 6. Create function to start impersonation session
CREATE OR REPLACE FUNCTION public.start_impersonation(
  p_target_user_id uuid,
  p_target_org_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_platform_role text;
  v_target_user RECORD;
  v_target_org RECORD;
  v_session_id uuid;
  v_session_token uuid;
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if actor is platform staff
  v_platform_role := get_platform_role(v_actor_id);
  
  IF v_platform_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized. Platform staff role required.');
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required for impersonation');
  END IF;
  
  -- Cannot impersonate yourself
  IF v_actor_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot impersonate yourself');
  END IF;
  
  -- Get target user info
  SELECT p.id, p.email, p.full_name
  INTO v_target_user
  FROM profiles p
  WHERE p.id = p_target_user_id;
  
  IF v_target_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
  END IF;
  
  -- Verify target user is member of target org
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_target_user_id
    AND organization_id = p_target_org_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user is not a member of the specified organization');
  END IF;
  
  -- Get target org info
  SELECT id, name INTO v_target_org
  FROM organizations
  WHERE id = p_target_org_id;
  
  IF v_target_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target organization not found');
  END IF;
  
  -- End any existing active sessions for this actor
  UPDATE impersonation_sessions
  SET status = 'ended', ended_at = now()
  WHERE actor_user_id = v_actor_id
  AND status = 'active';
  
  -- Create new session
  v_session_token := gen_random_uuid();
  
  INSERT INTO impersonation_sessions (
    actor_user_id,
    target_user_id,
    target_user_email,
    target_user_name,
    target_organization_id,
    target_organization_name,
    reason,
    session_token
  ) VALUES (
    v_actor_id,
    p_target_user_id,
    v_target_user.email,
    v_target_user.full_name,
    p_target_org_id,
    v_target_org.name,
    trim(p_reason),
    v_session_token
  ) RETURNING id INTO v_session_id;
  
  -- Log audit event
  INSERT INTO audit_events (
    organization_id,
    actor_user_id,
    action,
    metadata
  ) VALUES (
    p_target_org_id,
    v_actor_id,
    'IMPERSONATION_STARTED',
    jsonb_build_object(
      'session_id', v_session_id,
      'impersonated_user_id', p_target_user_id,
      'impersonated_user_email', v_target_user.email,
      'impersonated_user_name', v_target_user.full_name,
      'reason', trim(p_reason),
      'platform_role', v_platform_role
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_token', v_session_token,
    'target_user_id', p_target_user_id,
    'target_user_email', v_target_user.email,
    'target_user_name', v_target_user.full_name,
    'target_organization_id', p_target_org_id,
    'target_organization_name', v_target_org.name,
    'expires_at', (now() + interval '30 minutes')
  );
END;
$$;

-- 7. Create function to validate and get active impersonation session
CREATE OR REPLACE FUNCTION public.get_active_impersonation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_session RECORD;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('active', false);
  END IF;
  
  -- Check for active, non-expired session
  SELECT *
  INTO v_session
  FROM impersonation_sessions
  WHERE actor_user_id = v_actor_id
  AND status = 'active'
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session IS NULL THEN
    -- Check if there's an expired session to mark
    UPDATE impersonation_sessions
    SET status = 'expired', ended_at = now()
    WHERE actor_user_id = v_actor_id
    AND status = 'active'
    AND expires_at <= now();
    
    RETURN jsonb_build_object('active', false);
  END IF;
  
  RETURN jsonb_build_object(
    'active', true,
    'session_id', v_session.id,
    'session_token', v_session.session_token,
    'target_user_id', v_session.target_user_id,
    'target_user_email', v_session.target_user_email,
    'target_user_name', v_session.target_user_name,
    'target_organization_id', v_session.target_organization_id,
    'target_organization_name', v_session.target_organization_name,
    'reason', v_session.reason,
    'started_at', v_session.started_at,
    'expires_at', v_session.expires_at,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_session.expires_at - now()))::int
  );
END;
$$;

-- 8. Create function to end impersonation session
CREATE OR REPLACE FUNCTION public.end_impersonation(p_session_token uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_session RECORD;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Find the session
  IF p_session_token IS NOT NULL THEN
    SELECT * INTO v_session
    FROM impersonation_sessions
    WHERE session_token = p_session_token
    AND actor_user_id = v_actor_id
    AND status = 'active';
  ELSE
    SELECT * INTO v_session
    FROM impersonation_sessions
    WHERE actor_user_id = v_actor_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active impersonation session found');
  END IF;
  
  -- End the session
  UPDATE impersonation_sessions
  SET status = 'ended', ended_at = now()
  WHERE id = v_session.id;
  
  -- Log audit event
  INSERT INTO audit_events (
    organization_id,
    actor_user_id,
    action,
    metadata
  ) VALUES (
    v_session.target_organization_id,
    v_actor_id,
    'IMPERSONATION_ENDED',
    jsonb_build_object(
      'session_id', v_session.id,
      'impersonated_user_id', v_session.target_user_id,
      'impersonated_user_email', v_session.target_user_email,
      'duration_seconds', EXTRACT(EPOCH FROM (now() - v_session.started_at))::int,
      'reason', v_session.reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'duration_seconds', EXTRACT(EPOCH FROM (now() - v_session.started_at))::int
  );
END;
$$;

-- 9. Create function to search users/orgs for support console
CREATE OR REPLACE FUNCTION public.support_search_users(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_results jsonb;
BEGIN
  v_actor_id := auth.uid();
  
  -- Verify caller is platform staff
  IF NOT is_platform_staff(v_actor_id) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;
  
  SELECT jsonb_agg(result)
  INTO v_results
  FROM (
    SELECT DISTINCT
      p.id as user_id,
      p.email,
      p.full_name,
      o.id as organization_id,
      o.name as organization_name,
      o.subdomain
    FROM profiles p
    JOIN organization_members om ON om.user_id = p.id
    JOIN organizations o ON o.id = om.organization_id
    WHERE (
      p.email ILIKE '%' || p_query || '%'
      OR p.full_name ILIKE '%' || p_query || '%'
      OR o.name ILIKE '%' || p_query || '%'
      OR o.subdomain ILIKE '%' || p_query || '%'
    )
    ORDER BY p.email
    LIMIT p_limit
  ) result;
  
  RETURN jsonb_build_object('results', COALESCE(v_results, '[]'::jsonb));
END;
$$;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_platform_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_impersonation(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_impersonation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_impersonation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_search_users(text, int) TO authenticated;