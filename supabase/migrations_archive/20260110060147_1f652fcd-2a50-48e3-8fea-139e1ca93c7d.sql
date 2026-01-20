-- =============================================================================
-- Step 4: Tenant Provisioning + Enterprise Custom Domains + Billing Gating
-- =============================================================================

-- =============================================================================
-- 1. FIRST: Generate subdomains for existing organizations that don't have one
-- =============================================================================

-- Create a helper function to generate unique subdomain from org name
CREATE OR REPLACE FUNCTION public.generate_unique_subdomain(p_org_name text, p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_subdomain text;
  v_subdomain text;
  v_counter int := 0;
BEGIN
  -- Convert name to valid subdomain format
  v_base_subdomain := lower(regexp_replace(p_org_name, '[^a-z0-9]+', '-', 'gi'));
  v_base_subdomain := trim(both '-' from v_base_subdomain);
  
  -- Ensure minimum length
  IF length(v_base_subdomain) < 2 THEN
    v_base_subdomain := 'org-' || substr(p_org_id::text, 1, 8);
  END IF;
  
  -- Truncate if too long
  IF length(v_base_subdomain) > 50 THEN
    v_base_subdomain := substr(v_base_subdomain, 1, 50);
  END IF;
  
  v_subdomain := v_base_subdomain;
  
  -- Find unique subdomain by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM organizations WHERE subdomain = v_subdomain AND id != p_org_id) LOOP
    v_counter := v_counter + 1;
    v_subdomain := v_base_subdomain || '-' || v_counter::text;
  END LOOP;
  
  RETURN v_subdomain;
END;
$$;

-- Populate subdomains for all orgs that don't have one
UPDATE organizations
SET subdomain = generate_unique_subdomain(name, id)
WHERE subdomain IS NULL OR subdomain = '';

-- Drop the helper function
DROP FUNCTION IF EXISTS public.generate_unique_subdomain(text, uuid);


-- =============================================================================
-- 2. NOW: Add constraints to organizations table
-- =============================================================================

-- Add NOT NULL constraint now that all rows have values
ALTER TABLE organizations 
  ALTER COLUMN subdomain SET NOT NULL;

-- Add check constraint for subdomain format
ALTER TABLE organizations 
  DROP CONSTRAINT IF EXISTS valid_subdomain_format;
  
ALTER TABLE organizations 
  ADD CONSTRAINT valid_subdomain_format 
  CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');

-- Add unique constraint on subdomain
ALTER TABLE organizations 
  DROP CONSTRAINT IF EXISTS organizations_subdomain_unique;
  
ALTER TABLE organizations 
  ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain);

-- Ensure stripe_price_id column exists
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS stripe_price_id text;


-- =============================================================================
-- 3. CREATE ORGANIZATION_DOMAINS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  domain_type text NOT NULL CHECK (domain_type IN ('root', 'subdomain')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active', 'failed', 'disabled')),
  verification_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  last_checked_at timestamptz,
  CONSTRAINT domain_unique UNIQUE (domain)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_organization_domains_org ON organization_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_domains_domain ON organization_domains(domain);
CREATE INDEX IF NOT EXISTS idx_organization_domains_status ON organization_domains(status);

-- Enable RLS
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_domains
CREATE POLICY "Users can view domains for their organization"
ON organization_domains FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert domains for their organization"
ON organization_domains FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update domains for their organization"
ON organization_domains FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete domains for their organization"
ON organization_domains FOR DELETE
USING (
  is_org_member(auth.uid(), organization_id) 
  AND has_role(auth.uid(), 'admin'::app_role)
);


-- =============================================================================
-- 4. CREATE AUDIT_EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

-- Enable RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_events
CREATE POLICY "Users can view audit events for their organization"
ON audit_events FOR SELECT
USING (
  organization_id IS NULL 
  OR is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "System and users can insert audit events"
ON audit_events FOR INSERT
WITH CHECK (
  actor_user_id = auth.uid() 
  OR actor_user_id IS NULL
);


-- =============================================================================
-- 5. RESERVED SUBDOMAINS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reserved_subdomains (
  subdomain text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert reserved subdomains
INSERT INTO reserved_subdomains (subdomain, reason) VALUES
  ('app', 'System reserved'),
  ('www', 'System reserved'),
  ('api', 'API endpoint'),
  ('admin', 'Admin portal'),
  ('support', 'Support portal'),
  ('billing', 'Billing portal'),
  ('docs', 'Documentation'),
  ('help', 'Help center'),
  ('static', 'Static assets'),
  ('assets', 'Static assets'),
  ('localhost', 'Development'),
  ('mail', 'Email services'),
  ('email', 'Email services'),
  ('ftp', 'FTP services'),
  ('cdn', 'CDN services'),
  ('status', 'Status page'),
  ('blog', 'Blog'),
  ('shop', 'E-commerce'),
  ('store', 'E-commerce'),
  ('test', 'Testing'),
  ('staging', 'Staging environment'),
  ('dev', 'Development environment'),
  ('demo', 'Demo environment')
ON CONFLICT (subdomain) DO NOTHING;


-- =============================================================================
-- 6. PROVISION TENANT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_org_name text,
  p_subdomain text
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_AUTHENTICATED',
      'message', 'User must be authenticated'
    );
  END IF;
  
  -- Check if user already belongs to an organization
  SELECT organization_id INTO v_existing_org_id
  FROM organization_members
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_org_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_HAS_ORG',
      'message', 'User already belongs to an organization'
    );
  END IF;
  
  -- Normalize subdomain
  v_normalized_subdomain := lower(trim(p_subdomain));
  
  -- Validate subdomain format
  IF v_normalized_subdomain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_SUBDOMAIN',
      'message', 'Subdomain must be 2-63 characters, lowercase alphanumeric with hyphens (no leading/trailing dash)'
    );
  END IF;
  
  -- Check if subdomain is reserved
  IF EXISTS (SELECT 1 FROM reserved_subdomains WHERE subdomain = v_normalized_subdomain) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SUBDOMAIN_RESERVED',
      'message', 'This subdomain is reserved'
    );
  END IF;
  
  -- Check if subdomain is already taken
  IF EXISTS (SELECT 1 FROM organizations WHERE subdomain = v_normalized_subdomain) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SUBDOMAIN_TAKEN',
      'message', 'This subdomain is already in use'
    );
  END IF;
  
  -- Create the organization
  INSERT INTO organizations (name, subdomain, subscription_tier, is_active)
  VALUES (p_org_name, v_normalized_subdomain, 'free', true)
  RETURNING id INTO v_org_id;
  
  -- Add user as admin
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin');
  
  -- Add admin role to user_roles
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
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
    'url', 'https://' || v_normalized_subdomain || '.casewyze.com'
  );
END;
$$;


-- =============================================================================
-- 7. CHECK SUBDOMAIN AVAILABILITY FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_subdomain_availability(p_subdomain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_normalized_subdomain text;
BEGIN
  v_normalized_subdomain := lower(trim(p_subdomain));
  
  IF v_normalized_subdomain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'INVALID_FORMAT',
      'message', 'Subdomain must be 2-63 characters, lowercase alphanumeric with hyphens'
    );
  END IF;
  
  IF EXISTS (SELECT 1 FROM reserved_subdomains WHERE subdomain = v_normalized_subdomain) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'RESERVED',
      'message', 'This subdomain is reserved'
    );
  END IF;
  
  IF EXISTS (SELECT 1 FROM organizations WHERE subdomain = v_normalized_subdomain) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'TAKEN',
      'message', 'This subdomain is already in use'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', true,
    'subdomain', v_normalized_subdomain
  );
END;
$$;


-- =============================================================================
-- 8. REQUEST CUSTOM DOMAIN FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.request_custom_domain(
  p_organization_id uuid,
  p_domain text,
  p_domain_type text DEFAULT 'subdomain'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_org_tier text;
  v_normalized_domain text;
  v_domain_id uuid;
  v_verification_token text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  
  IF NOT (is_org_member(v_user_id, p_organization_id) AND has_role(v_user_id, 'admin'::app_role)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_AUTHORIZED',
      'message', 'Only organization admins can request custom domains'
    );
  END IF;
  
  SELECT subscription_tier INTO v_org_tier FROM organizations WHERE id = p_organization_id;
  
  IF v_org_tier IS NULL OR v_org_tier != 'enterprise' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_ELIGIBLE',
      'message', 'Custom domains are only available on Enterprise plan'
    );
  END IF;
  
  v_normalized_domain := lower(trim(p_domain));
  
  IF p_domain_type NOT IN ('root', 'subdomain') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DOMAIN_TYPE');
  END IF;
  
  IF EXISTS (SELECT 1 FROM organization_domains WHERE domain = v_normalized_domain) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DOMAIN_ALREADY_EXISTS',
      'message', 'This domain is already registered'
    );
  END IF;
  
  v_verification_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  INSERT INTO organization_domains (organization_id, domain, domain_type, status, verification_token)
  VALUES (p_organization_id, v_normalized_domain, p_domain_type, 'pending', v_verification_token)
  RETURNING id INTO v_domain_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_organization_id, v_user_id, 'DOMAIN_REQUESTED', 
    jsonb_build_object('domain', v_normalized_domain, 'domain_type', p_domain_type));
  
  RETURN jsonb_build_object(
    'success', true,
    'domain_id', v_domain_id,
    'domain', v_normalized_domain,
    'verification_instructions', jsonb_build_object(
      'type', 'TXT',
      'name', '_casewyze-verification.' || v_normalized_domain,
      'value', 'casewyze-verify=' || v_verification_token
    )
  );
END;
$$;


-- =============================================================================
-- 9. RESOLVE TENANT BY CUSTOM DOMAIN FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_tenant_by_domain(p_hostname text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_subdomain text;
BEGIN
  SELECT od.organization_id, o.name, o.subdomain
  INTO v_org_id, v_org_name, v_subdomain
  FROM organization_domains od
  JOIN organizations o ON o.id = od.organization_id
  WHERE od.domain = lower(p_hostname)
    AND od.status = 'active'
    AND o.is_active = true
  LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'organization_id', v_org_id,
      'organization_name', v_org_name,
      'subdomain', v_subdomain,
      'resolution_type', 'custom_domain'
    );
  END IF;
  
  RETURN jsonb_build_object('found', false, 'resolution_type', 'none');
END;
$$;


-- =============================================================================
-- 10. UPDATE ORGANIZATION SUBSCRIPTION HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_organization_subscription(
  p_stripe_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_old_tier text;
  v_new_tier text;
BEGIN
  SELECT id, subscription_tier INTO v_org_id, v_old_tier
  FROM organizations
  WHERE stripe_customer_id = p_stripe_customer_id;
  
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORG_NOT_FOUND');
  END IF;
  
  v_new_tier := CASE
    WHEN p_price_id LIKE '%enterprise%' OR p_price_id LIKE '%ent%' THEN 'enterprise'
    WHEN p_price_id LIKE '%pro%' THEN 'pro'
    WHEN p_price_id LIKE '%standard%' OR p_price_id LIKE '%basic%' THEN 'standard'
    WHEN p_price_id IS NULL OR p_status IN ('canceled', 'unpaid') THEN 'free'
    ELSE 'standard'
  END;
  
  UPDATE organizations
  SET stripe_subscription_id = p_subscription_id,
      stripe_price_id = p_price_id,
      subscription_tier = v_new_tier,
      subscription_status = p_status,
      updated_at = now()
  WHERE id = v_org_id;
  
  -- Disable custom domains if downgrading from enterprise
  IF v_old_tier = 'enterprise' AND v_new_tier != 'enterprise' THEN
    UPDATE organization_domains SET status = 'disabled' WHERE organization_id = v_org_id AND status = 'active';
  END IF;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_org_id, NULL, 'PLAN_CHANGED', 
    jsonb_build_object('old_tier', v_old_tier, 'new_tier', v_new_tier, 'subscription_id', p_subscription_id));
  
  RETURN jsonb_build_object('success', true, 'organization_id', v_org_id, 'old_tier', v_old_tier, 'new_tier', v_new_tier);
END;
$$;