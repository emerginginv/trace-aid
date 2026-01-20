-- Step 14: SSO & SCIM (Enterprise Identity)
-- Enable pgcrypto extension if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enums for SSO providers and SCIM status
CREATE TYPE sso_provider_type AS ENUM ('oidc', 'saml');
CREATE TYPE scim_action_type AS ENUM ('create', 'update', 'deactivate', 'reactivate');

-- Organization SSO configurations
CREATE TABLE IF NOT EXISTS public.organization_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider sso_provider_type NOT NULL DEFAULT 'oidc',
  idp_name text NOT NULL,
  issuer_url text NOT NULL,
  client_id text NOT NULL,
  client_secret_encrypted text,
  sso_login_url text,
  certificate text,
  metadata_url text,
  enabled boolean NOT NULL DEFAULT false,
  enforce_sso boolean NOT NULL DEFAULT false,
  default_role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(organization_id)
);

-- Organization SCIM configurations
CREATE TABLE IF NOT EXISTS public.organization_scim_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scim_token_hash text NOT NULL,
  scim_endpoint_url text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(organization_id)
);

-- SCIM provisioning logs for audit
CREATE TABLE IF NOT EXISTS public.scim_provisioning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action scim_action_type NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id),
  target_email text NOT NULL,
  external_id text,
  role_assigned text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  request_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SSO role mappings
CREATE TABLE IF NOT EXISTS public.sso_role_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  idp_group_name text NOT NULL,
  app_role text NOT NULL DEFAULT 'member',
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, idp_group_name)
);

-- Enable RLS on all tables
ALTER TABLE public.organization_sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_scim_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_provisioning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_role_mappings ENABLE ROW LEVEL SECURITY;

-- SSO Config RLS
CREATE POLICY "Org admins can view SSO config"
  ON public.organization_sso_configs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org admins can manage SSO config"
  ON public.organization_sso_configs FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform staff can view all SSO configs"
  ON public.organization_sso_configs FOR SELECT
  USING (is_platform_staff(auth.uid()));

-- SCIM Config RLS
CREATE POLICY "Org admins can view SCIM config"
  ON public.organization_scim_configs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org admins can manage SCIM config"
  ON public.organization_scim_configs FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform staff can view all SCIM configs"
  ON public.organization_scim_configs FOR SELECT
  USING (is_platform_staff(auth.uid()));

-- SCIM Logs RLS
CREATE POLICY "Org admins can view SCIM logs"
  ON public.scim_provisioning_logs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform staff can view all SCIM logs"
  ON public.scim_provisioning_logs FOR SELECT
  USING (is_platform_staff(auth.uid()));

CREATE POLICY "Service role can manage SCIM logs"
  ON public.scim_provisioning_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Role Mappings RLS
CREATE POLICY "Org admins can view role mappings"
  ON public.sso_role_mappings FOR SELECT
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org admins can manage role mappings"
  ON public.sso_role_mappings FOR ALL
  USING (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_member(auth.uid(), organization_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_organization_sso_configs_updated_at
  BEFORE UPDATE ON public.organization_sso_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sso_role_mappings_updated_at
  BEFORE UPDATE ON public.sso_role_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Check if organization has enterprise plan
CREATE OR REPLACE FUNCTION public.is_enterprise_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier IN ('enterprise', 'professional') 
     FROM organizations WHERE id = p_org_id),
    false
  );
$$;

-- Get SSO configuration for organization
CREATE OR REPLACE FUNCTION public.get_sso_config(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can view SSO config';
  END IF;
  
  SELECT jsonb_build_object(
    'id', sso.id, 'provider', sso.provider, 'idp_name', sso.idp_name,
    'issuer_url', sso.issuer_url, 'client_id', sso.client_id,
    'sso_login_url', sso.sso_login_url, 'enabled', sso.enabled,
    'enforce_sso', sso.enforce_sso, 'default_role', sso.default_role,
    'created_at', sso.created_at, 'updated_at', sso.updated_at,
    'is_enterprise', is_enterprise_org(p_org_id)
  ) INTO result
  FROM organization_sso_configs sso WHERE sso.organization_id = p_org_id;
  
  IF result IS NULL THEN
    RETURN jsonb_build_object('configured', false, 'is_enterprise', is_enterprise_org(p_org_id));
  END IF;
  
  RETURN result || jsonb_build_object('configured', true);
END;
$$;

-- Configure SSO for organization
CREATE OR REPLACE FUNCTION public.configure_sso(
  p_org_id uuid, p_provider text, p_idp_name text, p_issuer_url text,
  p_client_id text, p_client_secret text DEFAULT NULL, p_sso_login_url text DEFAULT NULL,
  p_certificate text DEFAULT NULL, p_default_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_config_id uuid;
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can configure SSO';
  END IF;
  
  IF NOT is_enterprise_org(p_org_id) THEN
    RAISE EXCEPTION 'SSO requires an enterprise plan';
  END IF;
  
  INSERT INTO organization_sso_configs (
    organization_id, provider, idp_name, issuer_url, client_id,
    client_secret_encrypted, sso_login_url, certificate, default_role, created_by
  )
  VALUES (
    p_org_id, p_provider::sso_provider_type, p_idp_name, p_issuer_url, p_client_id,
    p_client_secret, p_sso_login_url, p_certificate, p_default_role, auth.uid()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    provider = EXCLUDED.provider, idp_name = EXCLUDED.idp_name,
    issuer_url = EXCLUDED.issuer_url, client_id = EXCLUDED.client_id,
    client_secret_encrypted = COALESCE(EXCLUDED.client_secret_encrypted, organization_sso_configs.client_secret_encrypted),
    sso_login_url = EXCLUDED.sso_login_url, certificate = EXCLUDED.certificate,
    default_role = EXCLUDED.default_role, updated_at = now()
  RETURNING id INTO v_config_id;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_org_id, auth.uid(), 'SSO_CONFIG_UPDATED', jsonb_build_object('provider', p_provider, 'idp_name', p_idp_name));
  
  RETURN jsonb_build_object('success', true, 'config_id', v_config_id);
END;
$$;

-- Enable/Disable SSO
CREATE OR REPLACE FUNCTION public.toggle_sso(p_org_id uuid, p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can toggle SSO';
  END IF;
  
  UPDATE organization_sso_configs SET enabled = p_enabled, updated_at = now()
  WHERE organization_id = p_org_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'SSO not configured for this organization'; END IF;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_org_id, auth.uid(), CASE WHEN p_enabled THEN 'SSO_ENABLED' ELSE 'SSO_DISABLED' END,
    jsonb_build_object('enabled', p_enabled));
  
  RETURN jsonb_build_object('success', true, 'enabled', p_enabled);
END;
$$;

-- Toggle enforce SSO
CREATE OR REPLACE FUNCTION public.toggle_enforce_sso(p_org_id uuid, p_enforce boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can toggle enforce SSO';
  END IF;
  
  UPDATE organization_sso_configs SET enforce_sso = p_enforce, updated_at = now()
  WHERE organization_id = p_org_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'SSO not configured for this organization'; END IF;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_org_id, auth.uid(), 'SSO_ENFORCE_UPDATED', jsonb_build_object('enforce_sso', p_enforce));
  
  RETURN jsonb_build_object('success', true, 'enforce_sso', p_enforce);
END;
$$;

-- Generate SCIM token using pgcrypto
CREATE OR REPLACE FUNCTION public.generate_scim_token(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_token text;
  v_token_hash text;
  v_endpoint_url text;
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can generate SCIM tokens';
  END IF;
  
  IF NOT is_enterprise_org(p_org_id) THEN
    RAISE EXCEPTION 'SCIM requires an enterprise plan';
  END IF;
  
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');
  v_endpoint_url := '/scim/v2/' || p_org_id::text;
  
  INSERT INTO organization_scim_configs (organization_id, scim_token_hash, scim_endpoint_url, enabled, created_by)
  VALUES (p_org_id, v_token_hash, v_endpoint_url, true, auth.uid())
  ON CONFLICT (organization_id) DO UPDATE SET
    scim_token_hash = EXCLUDED.scim_token_hash, rotated_at = now(), enabled = true;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_org_id, auth.uid(), 'SCIM_TOKEN_ROTATED', jsonb_build_object('rotated_at', now()));
  
  RETURN jsonb_build_object('success', true, 'token', v_token, 'endpoint_url', v_endpoint_url,
    'message', 'Save this token now. It will not be shown again.');
END;
$$;

-- Get SCIM config (without token)
CREATE OR REPLACE FUNCTION public.get_scim_config(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can view SCIM config';
  END IF;
  
  SELECT jsonb_build_object(
    'id', scim.id, 'enabled', scim.enabled, 'endpoint_url', scim.scim_endpoint_url,
    'created_at', scim.created_at, 'rotated_at', scim.rotated_at,
    'is_enterprise', is_enterprise_org(p_org_id)
  ) INTO result
  FROM organization_scim_configs scim WHERE scim.organization_id = p_org_id;
  
  IF result IS NULL THEN
    RETURN jsonb_build_object('configured', false, 'is_enterprise', is_enterprise_org(p_org_id));
  END IF;
  
  RETURN result || jsonb_build_object('configured', true);
END;
$$;

-- Toggle SCIM
CREATE OR REPLACE FUNCTION public.toggle_scim(p_org_id uuid, p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can toggle SCIM';
  END IF;
  
  UPDATE organization_scim_configs SET enabled = p_enabled WHERE organization_id = p_org_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'SCIM not configured for this organization'; END IF;
  
  INSERT INTO audit_events (organization_id, actor_user_id, action, metadata)
  VALUES (p_org_id, auth.uid(), CASE WHEN p_enabled THEN 'SCIM_ENABLED' ELSE 'SCIM_DISABLED' END,
    jsonb_build_object('enabled', p_enabled));
  
  RETURN jsonb_build_object('success', true, 'enabled', p_enabled);
END;
$$;

-- Add role mapping
CREATE OR REPLACE FUNCTION public.add_role_mapping(
  p_org_id uuid, p_idp_group_name text, p_app_role text, p_priority integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_mapping_id uuid;
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can manage role mappings';
  END IF;
  
  INSERT INTO sso_role_mappings (organization_id, idp_group_name, app_role, priority)
  VALUES (p_org_id, p_idp_group_name, p_app_role, p_priority)
  ON CONFLICT (organization_id, idp_group_name) DO UPDATE SET
    app_role = EXCLUDED.app_role, priority = EXCLUDED.priority, updated_at = now()
  RETURNING id INTO v_mapping_id;
  
  RETURN jsonb_build_object('success', true, 'mapping_id', v_mapping_id);
END;
$$;

-- Delete role mapping
CREATE OR REPLACE FUNCTION public.delete_role_mapping(p_mapping_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM sso_role_mappings WHERE id = p_mapping_id;
  
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Role mapping not found'; END IF;
  
  IF NOT (is_org_member(auth.uid(), v_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can delete role mappings';
  END IF;
  
  DELETE FROM sso_role_mappings WHERE id = p_mapping_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get role mappings
CREATE OR REPLACE FUNCTION public.get_role_mappings(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_org_member(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to view role mappings';
  END IF;
  
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', rm.id, 'idp_group_name', rm.idp_group_name,
        'app_role', rm.app_role, 'priority', rm.priority)
      ORDER BY rm.priority DESC
    ), '[]'::jsonb)
    FROM sso_role_mappings rm WHERE rm.organization_id = p_org_id
  );
END;
$$;

-- Get SCIM provisioning logs
CREATE OR REPLACE FUNCTION public.get_scim_logs(p_org_id uuid, p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can view SCIM logs';
  END IF;
  
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', log.id, 'action', log.action, 'target_email', log.target_email,
        'external_id', log.external_id, 'role_assigned', log.role_assigned,
        'success', log.success, 'error_message', log.error_message, 'created_at', log.created_at)
      ORDER BY log.created_at DESC
    ), '[]'::jsonb)
    FROM scim_provisioning_logs log
    WHERE log.organization_id = p_org_id
    LIMIT p_limit
  );
END;
$$;

-- Validate SCIM token (for edge function) - using extensions schema
CREATE OR REPLACE FUNCTION public.validate_scim_token(p_org_id uuid, p_token text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_scim_configs
    WHERE organization_id = p_org_id
      AND enabled = true
      AND scim_token_hash = encode(extensions.digest(p_token::bytea, 'sha256'), 'hex')
  );
$$;

-- Check if SSO is enforced for org (used in auth flow)
CREATE OR REPLACE FUNCTION public.get_org_auth_config(p_subdomain text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'organization_id', o.id, 'organization_name', o.name,
    'sso_enabled', COALESCE(sso.enabled, false),
    'enforce_sso', COALESCE(sso.enforce_sso, false),
    'idp_name', sso.idp_name, 'sso_login_url', sso.sso_login_url, 'provider', sso.provider
  )
  FROM organizations o
  LEFT JOIN organization_sso_configs sso ON sso.organization_id = o.id
  WHERE o.subdomain = p_subdomain AND o.status = 'active';
$$;

-- Get Enterprise Identity dashboard stats
CREATE OR REPLACE FUNCTION public.get_identity_dashboard(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_sso_config jsonb;
  v_scim_config jsonb;
  v_role_mappings jsonb;
  v_recent_logs jsonb;
  v_provisioned_count integer;
  v_deprovisioned_count integer;
BEGIN
  IF NOT (is_org_member(auth.uid(), p_org_id) AND has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only org admins can view identity dashboard';
  END IF;
  
  SELECT get_sso_config(p_org_id) INTO v_sso_config;
  SELECT get_scim_config(p_org_id) INTO v_scim_config;
  SELECT get_role_mappings(p_org_id) INTO v_role_mappings;
  SELECT get_scim_logs(p_org_id, 10) INTO v_recent_logs;
  
  SELECT COUNT(*) INTO v_provisioned_count FROM scim_provisioning_logs
  WHERE organization_id = p_org_id AND action = 'create' AND success = true;
    
  SELECT COUNT(*) INTO v_deprovisioned_count FROM scim_provisioning_logs
  WHERE organization_id = p_org_id AND action = 'deactivate' AND success = true;
  
  RETURN jsonb_build_object(
    'is_enterprise', is_enterprise_org(p_org_id),
    'sso', v_sso_config, 'scim', v_scim_config,
    'role_mappings', v_role_mappings, 'recent_logs', v_recent_logs,
    'stats', jsonb_build_object('total_provisioned', v_provisioned_count, 'total_deprovisioned', v_deprovisioned_count)
  );
END;
$$;