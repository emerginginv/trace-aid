-- Update domain references from casewyze.com to unifiedcases.com

-- 1. Update get_user_organizations function to use new domain
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(
  id uuid,
  name text,
  subdomain text,
  logo_url text,
  is_current boolean,
  primary_domain text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      o.subdomain || '.unifiedcases.com'
    ) AS primary_domain
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = v_user_id
  AND o.is_active = true
  ORDER BY o.name;
END;
$$;

-- 2. Update signup_with_organization function to use new domain
CREATE OR REPLACE FUNCTION public.signup_with_organization(
  p_org_name text,
  p_subdomain text,
  p_user_email text,
  p_plan_key text DEFAULT 'free'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_normalized_subdomain text;
  v_existing_org_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Normalize subdomain
  v_normalized_subdomain := lower(trim(p_subdomain));
  
  -- Validate subdomain format
  IF v_normalized_subdomain !~ '^[a-z][a-z0-9-]{2,29}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid subdomain format. Must start with a letter, be 3-30 characters, and contain only lowercase letters, numbers, and hyphens.'
    );
  END IF;
  
  -- Check for reserved subdomains
  IF v_normalized_subdomain = ANY(ARRAY['www', 'api', 'app', 'admin', 'mail', 'email', 'support', 'help', 'docs', 'blog', 'status', 'staging', 'dev', 'test', 'demo', 'portal', 'dashboard', 'login', 'auth', 'oauth', 'sso']) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This subdomain is reserved. Please choose a different one.'
    );
  END IF;
  
  -- Check if subdomain is already taken
  SELECT id INTO v_existing_org_id 
  FROM organizations 
  WHERE subdomain = v_normalized_subdomain;
  
  IF v_existing_org_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This subdomain is already taken. Please choose a different one.'
    );
  END IF;
  
  -- Create the organization
  INSERT INTO organizations (name, subdomain, owner_id, plan_key, is_active)
  VALUES (p_org_name, v_normalized_subdomain, v_user_id, p_plan_key, true)
  RETURNING id INTO v_org_id;
  
  -- Add user as owner member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');
  
  -- Log audit events
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (
    v_org_id,
    v_user_id,
    'ORG_CREATED',
    jsonb_build_object('org_name', p_org_name, 'subdomain', v_normalized_subdomain)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'subdomain', v_normalized_subdomain,
    'url', 'https://' || v_normalized_subdomain || '.unifiedcases.com'
  );
END;
$$;