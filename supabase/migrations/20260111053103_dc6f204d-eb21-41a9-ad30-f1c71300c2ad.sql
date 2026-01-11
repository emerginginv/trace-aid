-- Add login branding columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS login_branding_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS login_logo_url text,
ADD COLUMN IF NOT EXISTS login_brand_name text,
ADD COLUMN IF NOT EXISTS login_accent_color text;

-- Add constraint for valid hex color (only if value is provided)
ALTER TABLE public.organizations
ADD CONSTRAINT valid_login_accent_color 
CHECK (login_accent_color IS NULL OR login_accent_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add constraint for brand name length
ALTER TABLE public.organizations
ADD CONSTRAINT valid_login_brand_name_length
CHECK (login_brand_name IS NULL OR length(login_brand_name) <= 50);

-- Create public RPC function to fetch tenant login branding (callable before auth)
CREATE OR REPLACE FUNCTION public.get_tenant_login_branding(p_subdomain text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'found', true,
        'branding_enabled', o.login_branding_enabled,
        'logo_url', CASE WHEN o.login_branding_enabled THEN o.login_logo_url END,
        'brand_name', CASE WHEN o.login_branding_enabled THEN o.login_brand_name END,
        'accent_color', CASE WHEN o.login_branding_enabled THEN o.login_accent_color END
      )
      FROM organizations o
      WHERE o.subdomain = lower(p_subdomain)
        AND o.is_active = true
      LIMIT 1
    ),
    jsonb_build_object('found', false)
  )
$$;

-- Grant execute permission to anon role (needed for unauthenticated access)
GRANT EXECUTE ON FUNCTION public.get_tenant_login_branding(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_login_branding(text) TO authenticated;