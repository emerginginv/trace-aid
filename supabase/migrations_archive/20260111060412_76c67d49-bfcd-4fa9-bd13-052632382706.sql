-- Update the public branding RPC function to include favicon_url (square_logo_url)
CREATE OR REPLACE FUNCTION public.get_tenant_login_branding(p_subdomain text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'found', true,
    'branding_enabled', o.login_branding_enabled,
    'logo_url', CASE WHEN o.login_branding_enabled THEN o.login_logo_url END,
    'brand_name', CASE WHEN o.login_branding_enabled THEN o.login_brand_name END,
    'accent_color', CASE WHEN o.login_branding_enabled THEN o.login_accent_color END,
    'favicon_url', os.square_logo_url  -- Always include for favicon (not gated by branding_enabled)
  )
  FROM organizations o
  LEFT JOIN organization_settings os ON os.organization_id = o.id
  WHERE o.subdomain = lower(p_subdomain)
    AND o.is_active = true
  LIMIT 1
$$;