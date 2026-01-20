
-- Step 19: Marketplace & Integrations Framework

-- Create enums
CREATE TYPE public.integration_category AS ENUM (
  'communications',
  'storage',
  'analytics',
  'legal',
  'payments',
  'productivity',
  'security'
);

CREATE TYPE public.integration_auth_type AS ENUM (
  'oauth',
  'api_key',
  'webhook'
);

CREATE TYPE public.integration_status AS ENUM (
  'installed',
  'disabled',
  'error'
);

-- Integrations catalog (available integrations)
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  provider text NOT NULL,
  category integration_category NOT NULL,
  description text,
  logo_url text,
  auth_type integration_auth_type NOT NULL,
  default_scopes text[] DEFAULT '{}',
  available_scopes text[] DEFAULT '{}',
  is_first_party boolean DEFAULT false,
  is_active boolean DEFAULT true,
  documentation_url text,
  required_plan text DEFAULT 'standard',
  created_at timestamptz DEFAULT now()
);

-- Organization integration installs
CREATE TABLE public.organization_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  status integration_status DEFAULT 'installed',
  scopes_granted text[] DEFAULT '{}',
  config jsonb DEFAULT '{}',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  installed_by uuid,
  installed_at timestamptz DEFAULT now(),
  disabled_at timestamptz,
  disabled_by uuid,
  last_used_at timestamptz,
  error_message text,
  UNIQUE(organization_id, integration_id)
);

-- Integration API keys
CREATE TABLE public.integration_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  scopes text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
);

-- Webhooks for outbound events
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_types text[] NOT NULL,
  endpoint_url text NOT NULL,
  secret_hash text NOT NULL,
  enabled boolean DEFAULT true,
  failure_count integer DEFAULT 0,
  last_triggered_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  disabled_at timestamptz
);

-- Webhook delivery logs
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempt_count integer DEFAULT 1,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integrations (catalog - read only for all)
CREATE POLICY "Anyone can view active integrations"
  ON public.integrations FOR SELECT
  USING (is_active = true);

-- RLS for organization_integrations
CREATE POLICY "Org members can view their integrations"
  ON public.organization_integrations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage integrations"
  ON public.organization_integrations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS for integration_api_keys
CREATE POLICY "Org admins can view API keys"
  ON public.integration_api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Org admins can manage API keys"
  ON public.integration_api_keys FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS for webhooks
CREATE POLICY "Org admins can view webhooks"
  ON public.webhooks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Org admins can manage webhooks"
  ON public.webhooks FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS for webhook_deliveries
CREATE POLICY "Org admins can view webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    webhook_id IN (
      SELECT w.id FROM public.webhooks w
      WHERE w.organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Function to install an integration
CREATE OR REPLACE FUNCTION public.install_integration(
  p_organization_id uuid,
  p_integration_id uuid,
  p_scopes text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_integration integrations%ROWTYPE;
  v_org_plan text;
  v_install_id uuid;
BEGIN
  -- Check user is org admin
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = v_user_id AND organization_id = p_organization_id;
  
  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only organization admins can install integrations';
  END IF;
  
  -- Get integration details
  SELECT * INTO v_integration
  FROM integrations
  WHERE id = p_integration_id AND is_active = true;
  
  IF v_integration.id IS NULL THEN
    RAISE EXCEPTION 'Integration not found or inactive';
  END IF;
  
  -- Check plan eligibility
  SELECT subscription_tier INTO v_org_plan
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_integration.required_plan = 'enterprise' AND v_org_plan NOT IN ('enterprise', 'pro') THEN
    -- Log blocked attempt
    INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
    VALUES (p_organization_id, v_user_id, 'INTEGRATION_BLOCKED_PLAN', jsonb_build_object(
      'integration_id', p_integration_id,
      'integration_name', v_integration.name,
      'required_plan', v_integration.required_plan,
      'current_plan', v_org_plan
    ));
    
    RAISE EXCEPTION 'Integration requires % plan', v_integration.required_plan;
  END IF;
  
  -- Install integration
  INSERT INTO organization_integrations (
    organization_id,
    integration_id,
    scopes_granted,
    installed_by
  )
  VALUES (
    p_organization_id,
    p_integration_id,
    COALESCE(p_scopes, v_integration.default_scopes),
    v_user_id
  )
  ON CONFLICT (organization_id, integration_id)
  DO UPDATE SET
    status = 'installed',
    scopes_granted = COALESCE(p_scopes, v_integration.default_scopes),
    disabled_at = NULL,
    disabled_by = NULL,
    error_message = NULL,
    installed_by = v_user_id,
    installed_at = now()
  RETURNING id INTO v_install_id;
  
  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_organization_id, v_user_id, 'INTEGRATION_INSTALLED', jsonb_build_object(
    'integration_id', p_integration_id,
    'integration_name', v_integration.name,
    'scopes_granted', COALESCE(p_scopes, v_integration.default_scopes)
  ));
  
  RETURN v_install_id;
END;
$$;

-- Function to disable an integration
CREATE OR REPLACE FUNCTION public.disable_integration(
  p_organization_id uuid,
  p_integration_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_integration_name text;
BEGIN
  -- Check user is org admin
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = v_user_id AND organization_id = p_organization_id;
  
  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only organization admins can disable integrations';
  END IF;
  
  -- Get integration name for audit
  SELECT i.name INTO v_integration_name
  FROM integrations i
  WHERE i.id = p_integration_id;
  
  -- Disable integration
  UPDATE organization_integrations
  SET 
    status = 'disabled',
    disabled_at = now(),
    disabled_by = v_user_id
  WHERE organization_id = p_organization_id AND integration_id = p_integration_id;
  
  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_organization_id, v_user_id, 'INTEGRATION_DISABLED', jsonb_build_object(
    'integration_id', p_integration_id,
    'integration_name', v_integration_name
  ));
  
  RETURN true;
END;
$$;

-- Function to create an API key
CREATE OR REPLACE FUNCTION public.create_integration_api_key(
  p_organization_id uuid,
  p_integration_id uuid,
  p_name text,
  p_scopes text[],
  p_expires_in_days integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_key text;
  v_key_prefix text;
  v_key_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Check user is org admin
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = v_user_id AND organization_id = p_organization_id;
  
  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only organization admins can create API keys';
  END IF;
  
  -- Generate key
  v_key := 'cw_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_key_prefix := substring(v_key from 1 for 12);
  
  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := now() + (p_expires_in_days || ' days')::interval;
  END IF;
  
  -- Insert key
  INSERT INTO integration_api_keys (
    organization_id,
    integration_id,
    name,
    key_hash,
    key_prefix,
    scopes,
    created_by,
    expires_at
  )
  VALUES (
    p_organization_id,
    p_integration_id,
    p_name,
    crypt(v_key, gen_salt('bf')),
    v_key_prefix,
    p_scopes,
    v_user_id,
    v_expires_at
  )
  RETURNING id INTO v_key_id;
  
  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_organization_id, v_user_id, 'API_KEY_CREATED', jsonb_build_object(
    'key_id', v_key_id,
    'key_name', p_name,
    'scopes', p_scopes,
    'integration_id', p_integration_id
  ));
  
  -- Return key (only shown once)
  RETURN jsonb_build_object(
    'id', v_key_id,
    'key', v_key,
    'prefix', v_key_prefix,
    'expires_at', v_expires_at
  );
END;
$$;

-- Function to revoke an API key
CREATE OR REPLACE FUNCTION public.revoke_integration_api_key(
  p_key_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_key_name text;
BEGIN
  -- Get key details and verify access
  SELECT ak.organization_id, ak.name INTO v_org_id, v_key_name
  FROM integration_api_keys ak
  JOIN organization_members om ON om.organization_id = ak.organization_id
  WHERE ak.id = p_key_id
    AND om.user_id = v_user_id
    AND om.role = 'admin';
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'API key not found or access denied';
  END IF;
  
  -- Revoke key
  UPDATE integration_api_keys
  SET revoked_at = now(), revoked_by = v_user_id
  WHERE id = p_key_id;
  
  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_org_id, v_user_id, 'API_KEY_REVOKED', jsonb_build_object(
    'key_id', p_key_id,
    'key_name', v_key_name
  ));
  
  RETURN true;
END;
$$;

-- Function to create a webhook
CREATE OR REPLACE FUNCTION public.create_webhook(
  p_organization_id uuid,
  p_name text,
  p_event_types text[],
  p_endpoint_url text,
  p_integration_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_org_plan text;
  v_secret text;
  v_webhook_id uuid;
BEGIN
  -- Check user is org admin
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE user_id = v_user_id AND organization_id = p_organization_id;
  
  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only organization admins can create webhooks';
  END IF;
  
  -- Check plan allows webhooks
  SELECT subscription_tier INTO v_org_plan
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_org_plan NOT IN ('standard', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Webhooks require Standard plan or higher';
  END IF;
  
  -- Generate secret
  v_secret := 'whsec_' || encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Insert webhook
  INSERT INTO webhooks (
    organization_id,
    integration_id,
    name,
    event_types,
    endpoint_url,
    secret_hash,
    created_by
  )
  VALUES (
    p_organization_id,
    p_integration_id,
    p_name,
    p_event_types,
    p_endpoint_url,
    crypt(v_secret, gen_salt('bf')),
    v_user_id
  )
  RETURNING id INTO v_webhook_id;
  
  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_organization_id, v_user_id, 'WEBHOOK_CREATED', jsonb_build_object(
    'webhook_id', v_webhook_id,
    'webhook_name', p_name,
    'event_types', p_event_types,
    'endpoint_url', p_endpoint_url
  ));
  
  -- Return webhook with secret (only shown once)
  RETURN jsonb_build_object(
    'id', v_webhook_id,
    'secret', v_secret
  );
END;
$$;

-- Function to disable a webhook
CREATE OR REPLACE FUNCTION public.disable_webhook(
  p_webhook_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_webhook_name text;
BEGIN
  -- Get webhook details and verify access
  SELECT w.organization_id, w.name INTO v_org_id, v_webhook_name
  FROM webhooks w
  JOIN organization_members om ON om.organization_id = w.organization_id
  WHERE w.id = p_webhook_id
    AND om.user_id = v_user_id
    AND om.role = 'admin';
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Webhook not found or access denied';
  END IF;
  
  -- Disable webhook
  UPDATE webhooks
  SET enabled = false, disabled_at = now()
  WHERE id = p_webhook_id;
  
  -- Audit log
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (v_org_id, v_user_id, 'WEBHOOK_DISABLED', jsonb_build_object(
    'webhook_id', p_webhook_id,
    'webhook_name', v_webhook_name
  ));
  
  RETURN true;
END;
$$;

-- Insert sample first-party integrations
INSERT INTO integrations (name, slug, provider, category, description, auth_type, default_scopes, available_scopes, is_first_party, required_plan) VALUES
('Slack', 'slack', 'Slack', 'communications', 'Send notifications and updates to Slack channels', 'oauth', ARRAY['notifications:send'], ARRAY['notifications:send', 'cases:read', 'updates:read'], true, 'standard'),
('Google Drive', 'google-drive', 'Google', 'storage', 'Store and sync attachments with Google Drive', 'oauth', ARRAY['attachments:read', 'attachments:write'], ARRAY['attachments:read', 'attachments:write', 'reports:export'], true, 'standard'),
('Microsoft 365', 'microsoft-365', 'Microsoft', 'productivity', 'Integrate with Outlook, OneDrive, and Teams', 'oauth', ARRAY['calendar:sync', 'attachments:read'], ARRAY['calendar:sync', 'attachments:read', 'attachments:write', 'notifications:send'], true, 'enterprise'),
('Dropbox', 'dropbox', 'Dropbox', 'storage', 'Sync files and attachments with Dropbox', 'oauth', ARRAY['attachments:read', 'attachments:write'], ARRAY['attachments:read', 'attachments:write'], true, 'standard'),
('Stripe', 'stripe', 'Stripe', 'payments', 'Process payments and manage billing', 'api_key', ARRAY['billing:read'], ARRAY['billing:read', 'billing:write', 'invoices:create'], true, 'enterprise'),
('QuickBooks', 'quickbooks', 'Intuit', 'payments', 'Sync invoices and financial data with QuickBooks', 'oauth', ARRAY['invoices:sync'], ARRAY['invoices:sync', 'expenses:sync', 'billing:read'], true, 'enterprise'),
('Zapier', 'zapier', 'Zapier', 'productivity', 'Connect CaseWyze to thousands of apps via Zapier', 'webhook', ARRAY['webhooks:receive'], ARRAY['webhooks:receive', 'cases:read', 'updates:read'], true, 'standard'),
('DocuSign', 'docusign', 'DocuSign', 'legal', 'Request and manage electronic signatures', 'oauth', ARRAY['documents:sign'], ARRAY['documents:sign', 'contracts:read'], true, 'enterprise');

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.install_integration TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_integration TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_integration_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_integration_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_webhook TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_webhook TO authenticated;
